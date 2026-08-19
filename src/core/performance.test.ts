import { describe, expect, it } from 'vitest'
import { diffOpenApi } from './diff'
import { parseOpenApi } from './parser'

describe('explainable large-input behavior', () => {
  it('parses a near-limit document without truncating content', () => {
    const source = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'large', version: '1', description: 'x'.repeat(9 * 1024 * 1024) },
      paths: {},
    })
    const started = performance.now()
    const parsed = parseOpenApi(source, 'large.json')
    expect(parsed.document.info.description).toHaveLength(9 * 1024 * 1024)
    expect(performance.now() - started).toBeLessThan(5_000)
  })

  it('normalizes and diffs 3000 endpoints deterministically', () => {
    const paths = Object.fromEntries(
      Array.from({ length: 3000 }, (_, index) => [
        `/items/${index}`,
        { get: { operationId: `getItem${index}`, responses: { '200': { description: 'ok' } } } },
      ]),
    )
    const document = JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'many', version: '1' },
      paths,
    })
    const started = performance.now()
    const parsed = parseOpenApi(document, 'many.json')
    const diff = diffOpenApi(parsed.document, parsed.operations, parsed.document, parsed.operations)
    expect(parsed.operations).toHaveLength(3000)
    expect(diff).toEqual([])
    expect(performance.now() - started).toBeLessThan(5_000)
  })
})
