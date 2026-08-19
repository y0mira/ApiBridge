import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_BYTES, parseOpenApi } from './parser'
import { FEATURE_SPEC } from '../test/fixtures'

describe('parseOpenApi', () => {
  it('imports YAML and normalizes operations', () => { const result = parseOpenApi(FEATURE_SPEC); expect(result.version).toBe('3.1.0'); expect(result.operations[0]).toMatchObject({ id: 'getNode', method: 'GET', path: '/nodes/{id}' }) })
  it('imports JSON', () => { const result = parseOpenApi(JSON.stringify({ openapi: '3.0.3', info: { title: 'x', version: '1' }, paths: {} }), 'x.json'); expect(result.issues[0]?.code).toBe('no-endpoints') })
  it('reports invalid syntax and versions', () => { expect(() => parseOpenApi('openapi: [')).toThrow(/语法错误/); expect(() => parseOpenApi('openapi: 2.0\ninfo: {}\npaths: {}')).toThrow(/仅支持/) })
  it('blocks unresolved refs', () => { const result = parseOpenApi('openapi: 3.0.3\ninfo: {title: x, version: 1}\npaths: {}\ncomponents:\n  schemas:\n    X: {$ref: "#/components/schemas/Missing"}'); expect(result.issues).toContainEqual(expect.objectContaining({ severity: 'error', code: 'unresolved-ref' })) })
  it('rejects oversized input', () => { expect(() => parseOpenApi('x'.repeat(MAX_IMPORT_BYTES + 1))).toThrow(/10 MiB/) })
  it('allows warnings without errors', () => { const result = parseOpenApi('openapi: 3.0.3\ninfo: {title: x, version: 1}\npaths: {}'); expect(result.issues.some((issue) => issue.severity === 'error')).toBe(false); expect(result.issues.some((issue) => issue.severity === 'warning')).toBe(true) })
})
