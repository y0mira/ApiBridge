import { describe, expect, it } from 'vitest'
import { diffOpenApi, diffToJson, diffToMarkdown } from './diff'
import { parseOpenApi } from './parser'

const baseline = `openapi: 3.1.0\ninfo: {title: v1, version: 1}\npaths:\n  /pets:\n    get:\n      operationId: listPets\n      parameters:\n        - {name: limit, in: query, schema: {type: integer}}\n      responses:\n        '200':\n          description: ok\n          content:\n            application/json:\n              schema: {$ref: '#/components/schemas/Pet'}\n  /old:\n    get:\n      responses: {'204': {description: ok}}\ncomponents:\n  schemas:\n    Pet:\n      type: object\n      required: [id, status]\n      properties:\n        id: {type: integer}\n        status: {type: string, enum: [active]}\n        removed: {type: string}\n`
const candidate = baseline
  .replace('name: limit, in: query, schema', 'name: limit, in: query, required: true, schema')
  .replace("  /old:\n    get:\n      responses: {'204': {description: ok}}\n", '')
  .replace('id: {type: integer}', 'id: {type: string}')
  .replace('enum: [active]', 'enum: [active, paused]')
  .replace('status: {type: string, enum:', 'status: {type: string, nullable: true, enum:')
  .replace('        removed: {type: string}\n', '')
  .replace('required: [id, status]', 'required: [id]')
  .replace(
    "      responses:\n        '200':",
    "      responses:\n        '201': {description: created}\n        '200':",
  )
describe('OpenAPI diff', () => {
  const before = parseOpenApi(baseline)
  const after = parseOpenApi(candidate)
  const items = diffOpenApi(before.document, before.operations, after.document, after.operations)
  it('covers endpoint, parameter, required, nullable/type, enum and response rules', () => {
    expect(items.map((item) => item.kind)).toEqual(
      expect.arrayContaining([
        'endpoint-removed',
        'parameter-required',
        'schema-type-changed',
        'enum-expanded',
        'nullable-changed',
        'required-removed',
        'response-added',
        'response-field-removed',
      ]),
    )
    expect(items.find((item) => item.kind === 'endpoint-removed')?.severity).toBe('breaking')
  })
  it('produces stable Markdown and JSON reports', () => {
    expect(diffToMarkdown(items)).toBe(diffToMarkdown([...items]))
    expect(diffToJson(items)).toBe(diffToJson([...items]))
    expect(JSON.parse(diffToJson(items))).toEqual({ schemaVersion: '1.0.0', items })
    expect(diffToMarkdown(items)).toContain('OpenAPI contract diff')
  })
  it('classifies required request body additions as breaking', () => {
    const bodyCandidate = parseOpenApi(
      baseline.replace(
        '      responses:',
        '      requestBody:\n        required: true\n        content:\n          application/json:\n            schema: {type: object}\n      responses:',
      ),
    )
    const bodyItems = diffOpenApi(
      before.document,
      before.operations,
      bodyCandidate.document,
      bodyCandidate.operations,
    )
    expect(bodyItems).toContainEqual(
      expect.objectContaining({ kind: 'request-body-added', severity: 'breaking' }),
    )
  })
})
