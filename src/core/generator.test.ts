import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { parseOpenApi } from './parser'
import { generateAll, generateMsw, generateTypes, generateZod } from './generator'
import { FEATURE_SPEC } from '../test/fixtures'
import { compileTypeScript } from '../test/compile'

const parsed = parseOpenApi(FEATURE_SPEC)
describe('generators', () => {
  it('generates required, optional, nullable, enum, array, dictionary, unions, intersections and recursion', () => {
    const types = generateTypes(parsed.document, parsed.operations).content
    expect(types).toContain('"id": number')
    expect(types).toContain('"label"?: string | null')
    expect(types).toContain('Array<"admin" | "user">')
    expect(types).toContain('[key: string]: unknown')
    expect(types).toContain('string | number')
    expect(types).toContain('&')
    const zod = generateZod(parsed.document, parsed.operations).content
    expect(zod).toContain('z.lazy')
    expect(zod).toContain('.nullable().optional()')
    expect(zod).toContain('z.enum(["admin", "user"])')
    expect(zod).toContain('.catchall(z.unknown())')
    expect(zod).toContain('.and(')
  })
  it('emits MSW 2 handlers that transpile', () => {
    const file = generateMsw(parsed.document, parsed.operations)
    expect(file.content).toContain("import { http, HttpResponse } from 'msw'")
    expect(file.content).toContain('http.get("*/nodes/:id"')
    const output = ts.transpileModule(file.content, {
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    expect(output.diagnostics).toEqual([])
  })
  it('is byte-for-byte stable', () => {
    expect(generateAll(parsed.document, parsed.operations)).toEqual(
      generateAll(parsed.document, parsed.operations),
    )
  })
  it('emits TypeScript, Zod and MSW files that compile together', () => {
    const files = generateAll(parsed.document, parsed.operations).slice(0, 3)
    expect(
      compileTypeScript(Object.fromEntries(files.map((file) => [file.name, file.content]))),
    ).toEqual([])
  })
})
