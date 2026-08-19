import type { GeneratedFile, OpenApiDocument, Operation, Schema } from './types'

const safeName = (value: string) => {
  const name = value.replace(/[^a-zA-Z0-9_$]+(.)?/g, (_, next: string) => next ? next.toUpperCase() : '').replace(/^[^a-zA-Z_$]/, '_$&')
  return name || 'Anonymous'
}
const quote = (value: string) => JSON.stringify(value)
const refName = (ref: unknown) => typeof ref === 'string' ? safeName(ref.split('/').at(-1) ?? 'Unknown') : undefined

type Context = { warnings: Set<string>; recursive: Set<string> }

function isNullable(schema: Schema) {
  return schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'))
}

function tsSchema(schema: Schema | undefined, context: Context, stack: string[] = []): string {
  if (!schema) { context.warnings.add('缺少 schema，已使用 unknown。'); return 'unknown' }
  const referenced = refName(schema.$ref)
  if (referenced) { if (stack.includes(referenced)) context.recursive.add(referenced); return referenced }
  let result: string
  if (schema.const !== undefined) result = JSON.stringify(schema.const)
  else if (Array.isArray(schema.enum)) result = schema.enum.map((item) => JSON.stringify(item)).join(' | ') || 'never'
  else if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) result = ((schema.oneOf ?? schema.anyOf) as Schema[]).map((part) => tsSchema(part, context, stack)).join(' | ')
  else if (Array.isArray(schema.allOf)) result = schema.allOf.map((part) => tsSchema(part as Schema, context, stack)).join(' & ')
  else if (schema.type === 'array' || schema.items) result = `Array<${tsSchema(schema.items as Schema | undefined, context, stack)}>`
  else if (schema.type === 'object' || schema.properties || schema.additionalProperties !== undefined) {
    const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : [])
    const fields = Object.entries((schema.properties as Record<string, Schema>) ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => `${quote(name)}${required.has(name) ? '' : '?'}: ${tsSchema(child, context, stack)};`)
    if (schema.additionalProperties === true) fields.push('[key: string]: unknown;')
    else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') fields.push(`[key: string]: ${tsSchema(schema.additionalProperties as Schema, context, stack)};`)
    result = `{ ${fields.join(' ')} }`
  } else if (schema.type === 'string') result = 'string'
  else if (schema.type === 'integer' || schema.type === 'number') result = 'number'
  else if (schema.type === 'boolean') result = 'boolean'
  else if (schema.type === 'null') result = 'null'
  else { context.warnings.add('存在无法精确表达的 schema，已使用 unknown。'); result = 'unknown' }
  return isNullable(schema) && result !== 'null' ? `${result} | null` : result
}

function zodSchema(schema: Schema | undefined, context: Context, stack: string[] = []): string {
  if (!schema) { context.warnings.add('缺少 schema，已使用 z.unknown()。'); return 'z.unknown()' }
  const referenced = refName(schema.$ref)
  if (referenced) { if (stack.includes(referenced)) context.recursive.add(referenced); return `${referenced}Schema` }
  let result: string
  if (schema.const !== undefined) result = `z.literal(${JSON.stringify(schema.const)})`
  else if (Array.isArray(schema.enum)) {
    const values = schema.enum
    result = values.every((item) => typeof item === 'string') && values.length ? `z.enum([${values.map(quote).join(', ')}])` : values.length ? `z.union([${values.map((item) => `z.literal(${JSON.stringify(item)})`).join(', ')}])` : 'z.never()'
  } else if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf)) result = `z.union([${((schema.oneOf ?? schema.anyOf) as Schema[]).map((part) => zodSchema(part, context, stack)).join(', ')}])`
  else if (Array.isArray(schema.allOf)) result = schema.allOf.map((part) => zodSchema(part as Schema, context, stack)).reduce((left, right) => `${left}.and(${right})`)
  else if (schema.type === 'array' || schema.items) result = `z.array(${zodSchema(schema.items as Schema | undefined, context, stack)})`
  else if (schema.type === 'object' || schema.properties || schema.additionalProperties !== undefined) {
    const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : [])
    const fields = Object.entries((schema.properties as Record<string, Schema>) ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => `${quote(name)}: ${zodSchema(child, context, stack)}${required.has(name) ? '' : '.optional()'}`)
    result = `z.object({ ${fields.join(', ')} })`
    if (schema.additionalProperties === true) result += '.catchall(z.unknown())'
    else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') result += `.catchall(${zodSchema(schema.additionalProperties as Schema, context, stack)})`
  } else if (schema.type === 'string') result = 'z.string()'
  else if (schema.type === 'integer') result = 'z.number().int()'
  else if (schema.type === 'number') result = 'z.number()'
  else if (schema.type === 'boolean') result = 'z.boolean()'
  else if (schema.type === 'null') result = 'z.null()'
  else { context.warnings.add('存在无法精确表达的 schema，已使用 z.unknown()。'); result = 'z.unknown()' }
  if (schema.minimum !== undefined) result += `.min(${Number(schema.minimum)})`
  if (schema.maximum !== undefined) result += `.max(${Number(schema.maximum)})`
  if (typeof schema.minLength === 'number') result += `.min(${schema.minLength})`
  if (typeof schema.maxLength === 'number') result += `.max(${schema.maxLength})`
  if (typeof schema.pattern === 'string') result += `.regex(new RegExp(${quote(schema.pattern)}))`
  const known = new Set(['$ref','type','nullable','enum','const','oneOf','anyOf','allOf','items','properties','required','additionalProperties','minimum','maximum','minLength','maxLength','pattern','description','title','default','example','examples','format','deprecated','readOnly','writeOnly'])
  if (Object.keys(schema).some((key) => !known.has(key))) context.warnings.add('部分 OpenAPI constraints 未映射到 Zod；请检查生成结果。')
  return isNullable(schema) && result !== 'z.null()' ? `${result}.nullable()` : result
}

function componentOrder(document: OpenApiDocument) { return Object.entries(document.components?.schemas ?? {}).sort(([a], [b]) => a.localeCompare(b)) }
function operationName(operation: Operation) { return safeName(operation.operationId ?? operation.id) }

export function generateTypes(document: OpenApiDocument, operations: Operation[]): GeneratedFile {
  const context: Context = { warnings: new Set(), recursive: new Set() }
  const components = componentOrder(document).map(([name, schema]) => `export type ${safeName(name)} = ${tsSchema(schema, context, [safeName(name)])}`).join('\n\n')
  const operationTypes = operations.map((operation) => {
    const name = operationName(operation)
    const groups = ['path','query','header','cookie'].map((location) => {
      const parameters = operation.parameters.filter((item) => item.in === location)
      const body = parameters.length ? `{ ${parameters.sort((a,b) => a.name.localeCompare(b.name)).map((item) => `${quote(item.name)}${item.required ? '' : '?'}: ${tsSchema(item.schema, context)};`).join(' ')} }` : 'Record<string, never>'
      return `export type ${name}${safeName(location)} = ${body}`
    })
    const body = `export type ${name}Body = ${tsSchema(operation.body?.schema, context)}${operation.body?.required ? '' : ' | undefined'}`
    const responses = operation.responses.length ? operation.responses.map((response) => `{ status: ${/^\d+$/.test(response.status) ? response.status : quote(response.status)}; body: ${tsSchema(response.schema, context)} }`).join(' | ') : 'never'
    return [...groups, body, `export type ${name}Response = ${responses}`].join('\n')
  }).join('\n\n')
  return { name: 'api-types.ts', language: 'typescript', content: `/* Generated by API Bridge. */\n${components}${components && operationTypes ? '\n\n' : ''}${operationTypes}\n`, warnings: [...context.warnings].sort() }
}

export function generateZod(document: OpenApiDocument, operations: Operation[]): GeneratedFile {
  const context: Context = { warnings: new Set(), recursive: new Set() }
  const schemas = componentOrder(document).map(([name, schema]) => {
    const safe = safeName(name)
    const expression = zodSchema(schema, context, [safe])
    const recursive = context.recursive.has(safe)
    return `export const ${safe}Schema${recursive ? `: z.ZodType<${safe}>` : ''} = ${recursive ? `z.lazy(() => ${expression})` : expression}`
  }).join('\n\n')
  const operationSchemas = operations.map((operation) => {
    const name = operationName(operation)
    const parameters = operation.parameters.sort((a,b) => a.name.localeCompare(b.name)).map((item) => `${quote(item.name)}: ${zodSchema(item.schema, context)}${item.required ? '' : '.optional()'}`)
    return `export const ${name}RequestSchema = z.object({ parameters: z.object({ ${parameters.join(', ')} }), body: ${zodSchema(operation.body?.schema, context)}${operation.body?.required ? '' : '.optional()'} })`
  }).join('\n\n')
  const typeImports = context.recursive.size ? `\nimport type { ${[...context.recursive].sort().join(', ')} } from './api-types'` : ''
  return { name: 'api-schemas.ts', language: 'typescript', content: `/* Generated by API Bridge. */\nimport { z } from 'zod'${typeImports}\n\n${schemas}${schemas && operationSchemas ? '\n\n' : ''}${operationSchemas}\n`, warnings: [...context.warnings].sort() }
}

function exampleFor(schema: Schema | undefined, document: OpenApiDocument, seen = new Set<string>()): unknown {
  if (!schema) return null
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0]
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
  const ref = typeof schema.$ref === 'string' ? schema.$ref : undefined
  if (ref) { if (seen.has(ref)) return null; seen.add(ref); const target = ref.split('/').slice(2).reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, document); return exampleFor(target as Schema | undefined, document, seen) }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length) return exampleFor(schema.oneOf[0] as Schema, document, seen)
  if (Array.isArray(schema.anyOf) && schema.anyOf.length) return exampleFor(schema.anyOf[0] as Schema, document, seen)
  if (Array.isArray(schema.allOf)) return Object.assign({}, ...schema.allOf.map((item) => exampleFor(item as Schema, document, new Set(seen))))
  if (schema.type === 'array' || schema.items) return [exampleFor(schema.items as Schema, document, seen)]
  if (schema.type === 'object' || schema.properties) return Object.fromEntries(Object.entries((schema.properties as Record<string, Schema>) ?? {}).sort(([a],[b]) => a.localeCompare(b)).map(([key, child]) => [key, exampleFor(child, document, new Set(seen))]))
  if (schema.type === 'string') return schema.format === 'date-time' ? '1970-01-01T00:00:00.000Z' : 'string'
  if (schema.type === 'integer' || schema.type === 'number') return 0
  if (schema.type === 'boolean') return false
  return null
}

export function generateMsw(document: OpenApiDocument, operations: Operation[]): GeneratedFile {
  const handlers = operations.map((operation) => {
    const response = operation.responses.find((item) => /^2\d\d$/.test(item.status)) ?? operation.responses[0]
    const status = response && /^\d+$/.test(response.status) ? Number(response.status) : 200
    const example = response?.example ?? exampleFor(response?.schema, document)
    return `  http.${operation.method.toLowerCase()}(${quote(`*${operation.path.replace(/{([^}]+)}/g, ':$1')}`)}, () => {\n    return HttpResponse.json(${JSON.stringify(example, null, 2).replace(/\n/g, '\n    ')}, { status: ${status} })\n  })`
  }).join(',\n')
  return { name: 'api-handlers.ts', language: 'typescript', content: `/* Generated by API Bridge. */\nimport { http, HttpResponse } from 'msw'\n\nexport const handlers = [\n${handlers}\n]\n`, warnings: [] }
}

export function generateAll(document: OpenApiDocument, operations: Operation[]) {
  return [generateTypes(document, operations), generateZod(document, operations), generateMsw(document, operations)]
}
