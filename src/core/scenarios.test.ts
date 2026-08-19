import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { parseOpenApi } from './parser'
import {
  createPresetScenarios,
  duplicateScenario,
  generateScenarioMsw,
  moveScenario,
  normalizeScenarios,
  sequenceStep,
  validateScenarioJson,
} from './scenarios'
import { FEATURE_SPEC } from '../test/fixtures'
import { compileTypeScript } from '../test/compile'

const parsed = parseOpenApi(FEATURE_SPEC)
const operation = parsed.operations[0]
describe('mock scenarios', () => {
  it('creates success, empty and common errors with stable ids', () => {
    const first = createPresetScenarios(operation)
    const second = createPresetScenarios(operation)
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
    expect(first.map((item) => item.status)).toEqual(
      expect.arrayContaining([200, 401, 403, 404, 409, 422, 429, 500]),
    )
  })
  it('copies, sorts, clamps delay and keeps one default', () => {
    const scenarios = createPresetScenarios(operation).slice(0, 2)
    const copy = duplicateScenario(scenarios[0], scenarios)
    const normalized = normalizeScenarios(
      [...scenarios, copy].map((item) => ({ ...item, isDefault: true, delayMs: 99_000 })),
      copy.id,
    )
    expect(normalized.filter((item) => item.isDefault)).toHaveLength(1)
    expect(normalized.every((item) => item.delayMs === 30_000)).toBe(true)
    expect(moveScenario(normalized, 2, 0)[0].id).toBe(copy.id)
  })
  it('supports invalid JSON, failures and response sequences in standalone MSW', () => {
    const scenario = {
      ...createPresetScenarios(operation)[0],
      body: '{',
      failure: 'network-error' as const,
      sequence: [sequenceStep(202, { state: 'pending' }), sequenceStep(200, { state: 'complete' })],
    }
    expect(validateScenarioJson(scenario)).toBeTruthy()
    const content = generateScenarioMsw(parsed.document, operation, [scenario])
    expect(content).toContain("request.headers.get('x-api-scenario')")
    expect(content).toContain("delay('infinite')")
    expect(content).toContain('sequenceIndex++')
    expect(
      ts.transpileModule(content, {
        reportDiagnostics: true,
        compilerOptions: { module: ts.ModuleKind.ESNext },
      }).diagnostics,
    ).toEqual([])
    expect(compileTypeScript({ 'api-scenarios.ts': content })).toEqual([])
  })
})
