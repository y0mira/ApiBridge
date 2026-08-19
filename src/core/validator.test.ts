import { describe, expect, it } from 'vitest'
import { parseOpenApi } from './parser'
import { redactSensitive, validateValue } from './validator'
import { FEATURE_SPEC } from '../test/fixtures'

const parsed = parseOpenApi(FEATURE_SPEC)
const schema = parsed.document.components!.schemas!.Node
describe('real response validation', () => {
  it('reports exact pointers for required, type, nullable and enum failures', () => {
    const issues = validateValue({ label: null, roles: ['owner'] }, schema, parsed.document)
    expect(issues.map((item) => item.pointer)).toEqual(['#/id', '#/roles/0'])
    expect(issues[0].message).toMatch(/必填/)
    expect(issues[1].expected).toContain('enum')
  })
  it('accepts valid values and redacts nested sensitive fields', () => {
    expect(
      validateValue(
        { id: 1, label: null, roles: ['admin'], metadata: {}, children: [] },
        schema,
        parsed.document,
      ),
    ).toEqual([])
    expect(
      redactSensitive({ token: 'abc', nested: { email: 'x@example.com', safe: 'ok' } }),
    ).toEqual({ token: '[REDACTED]', nested: { email: '[REDACTED]', safe: 'ok' } })
  })
})
