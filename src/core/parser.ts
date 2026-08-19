import { parseDocument } from 'yaml'
import type { Issue, OpenApiDocument, Operation, Parameter, ParsedSpec, Schema } from './types'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const

function pointer(path: (string | number)[]) {
  return `#/${path.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`
}

export function resolveRef(document: OpenApiDocument, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined
  return ref
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      document,
    )
}

function findRefs(
  value: unknown,
  document: OpenApiDocument,
  path: (string | number)[] = [],
  issues: Issue[] = [],
  seen = new Set<unknown>(),
) {
  if (!value || typeof value !== 'object' || seen.has(value)) return issues
  seen.add(value)
  if ('$ref' in value && typeof (value as { $ref?: unknown }).$ref === 'string') {
    const ref = (value as { $ref: string }).$ref
    if (!ref.startsWith('#/'))
      issues.push({
        severity: 'warning',
        code: 'external-ref',
        message: `外部 $ref 暂不解析：${ref}`,
        path: pointer(path),
      })
    else if (resolveRef(document, ref) === undefined)
      issues.push({
        severity: 'error',
        code: 'unresolved-ref',
        message: `无法解析 $ref：${ref}`,
        path: pointer(path),
      })
  }
  for (const [key, child] of Object.entries(value))
    findRefs(child, document, [...path, key], issues, seen)
  return issues
}

export function stableOperationId(method: string, path: string) {
  return `${method.toLowerCase()}_${
    path
      .replace(/[{}]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'root'
  }`
}

function asSchema(value: unknown): Schema | undefined {
  return value && typeof value === 'object' ? (value as Schema) : undefined
}

function normalize(document: OpenApiDocument): Operation[] {
  const operations: Operation[] = []
  for (const [path, pathItemValue] of Object.entries(document.paths)) {
    const pathItem = pathItemValue as Record<string, unknown>
    const shared = Array.isArray(pathItem.parameters) ? pathItem.parameters : []
    for (const method of METHODS) {
      const raw = pathItem[method]
      if (!raw || typeof raw !== 'object') continue
      const op = raw as Record<string, unknown>
      const rawParameters = [...shared, ...(Array.isArray(op.parameters) ? op.parameters : [])]
      const parameters = rawParameters.flatMap((rawParameter): Parameter[] => {
        const resolved =
          rawParameter && typeof rawParameter === 'object' && '$ref' in rawParameter
            ? resolveRef(document, String((rawParameter as { $ref: unknown }).$ref))
            : rawParameter
        if (!resolved || typeof resolved !== 'object') return []
        const p = resolved as Record<string, unknown>
        if (!['path', 'query', 'header', 'cookie'].includes(String(p.in))) return []
        return [
          {
            name: String(p.name ?? 'parameter'),
            in: p.in as Parameter['in'],
            required: p.in === 'path' || p.required === true,
            schema: asSchema(p.schema),
          },
        ]
      })
      const requestBody = op.requestBody as Record<string, unknown> | undefined
      const requestContent = requestBody?.content as
        Record<string, Record<string, unknown>> | undefined
      const bodyEntry = requestContent
        ? Object.entries(requestContent).sort(([a], [b]) => a.localeCompare(b))[0]
        : undefined
      const responses = Object.entries((op.responses as Record<string, unknown>) ?? {}).flatMap(
        ([status, rawResponse]) => {
          if (!rawResponse || typeof rawResponse !== 'object') return []
          const response = rawResponse as Record<string, unknown>
          const content = response.content as Record<string, Record<string, unknown>> | undefined
          const entries: [string, Record<string, unknown>][] = content
            ? Object.entries(content).sort(([a], [b]) => a.localeCompare(b))
            : [['application/json', {}]]
          return entries.map(([contentType, media]) => ({
            status,
            contentType,
            schema: asSchema(media.schema),
            example:
              media.examples && typeof media.examples === 'object'
                ? Object.values(media.examples as Record<string, { value?: unknown }>)[0]?.value
                : media.example,
          }))
        },
      )
      const operationId = typeof op.operationId === 'string' ? op.operationId : undefined
      operations.push({
        id: operationId ?? stableOperationId(method, path),
        operationId,
        method: method.toUpperCase(),
        path,
        summary: String(op.summary ?? op.description ?? ''),
        tags: Array.isArray(op.tags) && op.tags.length ? op.tags.map(String) : ['Untagged'],
        deprecated: op.deprecated === true,
        parameters,
        body: bodyEntry
          ? {
              required: requestBody?.required === true,
              contentType: bodyEntry[0],
              schema: asSchema(bodyEntry[1].schema),
            }
          : undefined,
        responses,
      })
    }
  }
  return operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
}

export function parseOpenApi(source: string, filename = 'pasted.yaml'): ParsedSpec {
  if (new TextEncoder().encode(source).byteLength > MAX_IMPORT_BYTES)
    throw new Error('文件超过 10 MiB 导入限制。')
  let value: unknown
  try {
    if (filename.toLowerCase().endsWith('.json')) value = JSON.parse(source)
    else {
      const parsed = parseDocument(source, { prettyErrors: true, uniqueKeys: true })
      if (parsed.errors.length)
        throw new Error(parsed.errors.map((error) => error.message).join('\n'))
      value = parsed.toJS({ maxAliasCount: 100 })
    }
  } catch (error) {
    throw new Error(`语法错误：${error instanceof Error ? error.message : String(error)}`)
  }
  if (!value || typeof value !== 'object') throw new Error('文档根节点必须是对象。')
  const document = value as OpenApiDocument
  if (typeof document.openapi !== 'string' || !/^3\.(0|1)(\.|$)/.test(document.openapi))
    throw new Error('仅支持 OpenAPI 3.0 和 3.1 文档。')
  const issues: Issue[] = []
  if (!document.info || typeof document.info !== 'object')
    issues.push({
      severity: 'error',
      code: 'missing-info',
      message: '缺少必需的 info 对象。',
      path: '#/info',
    })
  if (!document.paths || typeof document.paths !== 'object')
    issues.push({
      severity: 'error',
      code: 'missing-paths',
      message: '缺少必需的 paths 对象。',
      path: '#/paths',
    })
  document.paths ??= {}
  findRefs(document, document, [], issues)
  const operations = normalize(document)
  const ids = new Map<string, number>()
  for (const operation of operations)
    if (operation.operationId)
      ids.set(operation.operationId, (ids.get(operation.operationId) ?? 0) + 1)
  for (const [id, count] of ids)
    if (count > 1)
      issues.push({
        severity: 'error',
        code: 'duplicate-operation-id',
        message: `operationId 冲突：${id}`,
      })
  if (!operations.length)
    issues.push({
      severity: 'warning',
      code: 'no-endpoints',
      message: '文档中没有 endpoint。',
      path: '#/paths',
    })
  return { document, version: document.openapi, operations, issues }
}
