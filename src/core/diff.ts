import type { DiffItem, OpenApiDocument, Operation, Schema } from './types'

export const DIFF_REPORT_SCHEMA_VERSION = '1.0.0' as const

const sortItems = (items: DiffItem[]) =>
  items.sort(
    (a, b) =>
      a.pointer.localeCompare(b.pointer) ||
      a.kind.localeCompare(b.kind) ||
      a.severity.localeCompare(b.severity),
  )
const opKey = (operation: Operation) => `${operation.method} ${operation.path}`
const schemaType = (schema?: Schema) => JSON.stringify(schema?.type ?? null)
const nullable = (schema?: Schema) =>
  schema?.nullable === true || (Array.isArray(schema?.type) && schema.type.includes('null'))
const json = (value: unknown) => JSON.stringify(value)

function compareSchema(
  before: Schema | undefined,
  after: Schema | undefined,
  pointer: string,
  items: DiffItem[],
  seen = new Set<string>(),
) {
  if (!before || !after) return
  const key = `${pointer}|${json(before)}|${json(after)}`
  if (seen.has(key)) return
  seen.add(key)
  if (schemaType(before) !== schemaType(after))
    items.push({
      severity: 'breaking',
      kind: 'schema-type-changed',
      pointer,
      before: before.type,
      after: after.type,
      reason: '响应字段类型变化会使现有消费者的类型假设失效。',
    })
  if (nullable(before) !== nullable(after))
    items.push({
      severity: nullable(after) ? 'breaking' : 'info',
      kind: 'nullable-changed',
      pointer,
      before: nullable(before),
      after: nullable(after),
      reason: nullable(after)
        ? '响应现在可能为 null，现有消费者可能未处理。'
        : '响应不再为 null，按响应兼容规则属于收窄输出。',
    })
  if (json(before.$ref) !== json(after.$ref))
    items.push({
      severity: 'warning',
      kind: 'ref-changed',
      pointer,
      before: before.$ref,
      after: after.$ref,
      reason: '引用目标变化，需要检查组件结构是否仍兼容。',
    })
  const beforeEnum = Array.isArray(before.enum) ? before.enum : []
  const afterEnum = Array.isArray(after.enum) ? after.enum : []
  const removedEnum = beforeEnum.filter(
    (value) => !afterEnum.some((next) => Object.is(next, value)),
  )
  const addedEnum = afterEnum.filter((value) => !beforeEnum.some((next) => Object.is(next, value)))
  if (removedEnum.length)
    items.push({
      severity: 'info',
      kind: 'enum-shrunk',
      pointer,
      before: beforeEnum,
      after: afterEnum,
      reason: '响应 enum 收缩不会产生未知新值，但可能反映行为变化。',
    })
  if (addedEnum.length)
    items.push({
      severity: 'breaking',
      kind: 'enum-expanded',
      pointer,
      before: beforeEnum,
      after: afterEnum,
      reason: '响应可能返回消费者尚未处理的新 enum 值。',
    })
  const beforeProps = (before.properties as Record<string, Schema>) ?? {}
  const afterProps = (after.properties as Record<string, Schema>) ?? {}
  const beforeReq = new Set(Array.isArray(before.required) ? before.required.map(String) : [])
  const afterReq = new Set(Array.isArray(after.required) ? after.required.map(String) : [])
  for (const name of Object.keys(beforeProps)
    .filter((name) => !(name in afterProps))
    .sort())
    items.push({
      severity: 'breaking',
      kind: 'response-field-removed',
      pointer: `${pointer}/properties/${name}`,
      before: beforeProps[name],
      reason: '项目采用响应消费者兼容规则：删除响应字段是破坏性变化。',
    })
  for (const name of Object.keys(afterProps)
    .filter((name) => !(name in beforeProps))
    .sort())
    items.push({
      severity: 'info',
      kind: 'response-field-added',
      pointer: `${pointer}/properties/${name}`,
      after: afterProps[name],
      reason: '新增响应字段通常向后兼容。',
    })
  for (const name of Object.keys(beforeProps)
    .filter((name) => name in afterProps)
    .sort()) {
    if (!beforeReq.has(name) && afterReq.has(name))
      items.push({
        severity: 'warning',
        kind: 'required-added',
        pointer: `${pointer}/required/${name}`,
        before: false,
        after: true,
        reason: '响应字段变为必填，服务端承诺增强但需要检查历史数据。',
      })
    if (beforeReq.has(name) && !afterReq.has(name))
      items.push({
        severity: 'breaking',
        kind: 'required-removed',
        pointer: `${pointer}/required/${name}`,
        before: true,
        after: false,
        reason: '原必填响应字段可能缺失，现有消费者可能失败。',
      })
    compareSchema(beforeProps[name], afterProps[name], `${pointer}/properties/${name}`, items, seen)
  }
}

export function diffOpenApi(
  beforeDoc: OpenApiDocument,
  beforeOps: Operation[],
  afterDoc: OpenApiDocument,
  afterOps: Operation[],
) {
  const items: DiffItem[] = []
  const beforeMap = new Map(beforeOps.map((op) => [opKey(op), op]))
  const afterMap = new Map(afterOps.map((op) => [opKey(op), op]))
  for (const [key, op] of beforeMap)
    if (!afterMap.has(key))
      items.push({
        severity: 'breaking',
        kind: 'endpoint-removed',
        pointer: `#/paths/${op.path}/${op.method.toLowerCase()}`,
        before: key,
        reason: '删除 endpoint 会破坏现有调用。',
      })
  for (const [key, op] of afterMap)
    if (!beforeMap.has(key))
      items.push({
        severity: 'info',
        kind: 'endpoint-added',
        pointer: `#/paths/${op.path}/${op.method.toLowerCase()}`,
        after: key,
        reason: '新增 endpoint 向后兼容。',
      })
  for (const [key, before] of beforeMap) {
    const after = afterMap.get(key)
    if (!after) continue
    const pointer = `#/paths/${before.path}/${before.method.toLowerCase()}`
    const beforeParams = new Map(before.parameters.map((p) => [`${p.in}:${p.name}`, p]))
    const afterParams = new Map(after.parameters.map((p) => [`${p.in}:${p.name}`, p]))
    for (const [name, param] of beforeParams)
      if (!afterParams.has(name))
        items.push({
          severity: 'breaking',
          kind: 'parameter-removed',
          pointer: `${pointer}/parameters/${name}`,
          before: param,
          reason: '移除已有请求参数会破坏依赖该参数的调用。',
        })
    for (const [name, param] of afterParams)
      if (!beforeParams.has(name))
        items.push({
          severity: param.required ? 'breaking' : 'info',
          kind: 'parameter-added',
          pointer: `${pointer}/parameters/${name}`,
          after: param,
          reason: param.required
            ? '新增必填请求参数会破坏现有调用。'
            : '新增可选请求参数向后兼容。',
        })
    for (const [name, bp] of beforeParams) {
      const ap = afterParams.get(name)
      if (!ap) continue
      if (!bp.required && ap.required)
        items.push({
          severity: 'breaking',
          kind: 'parameter-required',
          pointer: `${pointer}/parameters/${name}/required`,
          before: false,
          after: true,
          reason: '请求参数变为必填会破坏现有调用。',
        })
      compareSchema(bp.schema, ap.schema, `${pointer}/parameters/${name}/schema`, items)
    }
    if (before.body && !after.body)
      items.push({
        severity: 'breaking',
        kind: 'request-body-removed',
        pointer: `${pointer}/requestBody`,
        before: before.body,
        reason: '移除已有 request body 会改变调用契约。',
      })
    if (!before.body && after.body)
      items.push({
        severity: after.body.required ? 'breaking' : 'info',
        kind: 'request-body-added',
        pointer: `${pointer}/requestBody`,
        after: after.body,
        reason: after.body.required
          ? '新增必填 request body 会破坏现有调用。'
          : '新增可选 request body 向后兼容。',
      })
    if (before.body && after.body) {
      if (!before.body.required && after.body.required)
        items.push({
          severity: 'breaking',
          kind: 'request-body-required',
          pointer: `${pointer}/requestBody/required`,
          before: false,
          after: true,
          reason: 'Request body 变为必填会破坏现有调用。',
        })
      if (before.body.contentType !== after.body.contentType)
        items.push({
          severity: 'breaking',
          kind: 'request-content-type-changed',
          pointer: `${pointer}/requestBody/content`,
          before: before.body.contentType,
          after: after.body.contentType,
          reason: '请求 content type 变化会破坏现有序列化方式。',
        })
      compareSchema(before.body.schema, after.body.schema, `${pointer}/requestBody/schema`, items)
    }
    const beforeResponses = new Map(before.responses.map((r) => [r.status, r]))
    const afterResponses = new Map(after.responses.map((r) => [r.status, r]))
    for (const status of beforeResponses.keys())
      if (!afterResponses.has(status))
        items.push({
          severity: 'breaking',
          kind: 'response-removed',
          pointer: `${pointer}/responses/${status}`,
          before: status,
          reason: '删除已声明响应状态会破坏依赖该分支的消费者。',
        })
    for (const status of afterResponses.keys())
      if (!beforeResponses.has(status))
        items.push({
          severity: 'warning',
          kind: 'response-added',
          pointer: `${pointer}/responses/${status}`,
          after: status,
          reason: '新增响应状态要求消费者检查未处理分支。',
        })
    for (const [status, response] of beforeResponses) {
      const next = afterResponses.get(status)
      if (next)
        compareSchema(response.schema, next.schema, `${pointer}/responses/${status}/schema`, items)
    }
  }
  const beforeSchemas = beforeDoc.components?.schemas ?? {}
  const afterSchemas = afterDoc.components?.schemas ?? {}
  for (const name of Object.keys(beforeSchemas)
    .filter((name) => !(name in afterSchemas))
    .sort())
    items.push({
      severity: 'breaking',
      kind: 'component-removed',
      pointer: `#/components/schemas/${name}`,
      before: beforeSchemas[name],
      reason: '删除 component schema 会破坏其引用者。',
    })
  for (const name of Object.keys(afterSchemas)
    .filter((name) => !(name in beforeSchemas))
    .sort())
    items.push({
      severity: 'info',
      kind: 'component-added',
      pointer: `#/components/schemas/${name}`,
      after: afterSchemas[name],
      reason: '新增 component schema 向后兼容。',
    })
  for (const name of Object.keys(beforeSchemas)
    .filter((name) => name in afterSchemas)
    .sort())
    compareSchema(beforeSchemas[name], afterSchemas[name], `#/components/schemas/${name}`, items)
  return sortItems(items)
}

export function diffToMarkdown(items: DiffItem[]) {
  return `# OpenAPI contract diff\n\n${items.length ? items.map((item) => `- **${item.severity.toUpperCase()}** \`${item.kind}\` at \`${item.pointer}\` — ${item.reason}`).join('\n') : 'No changes.'}\n`
}
export function diffToJson(items: DiffItem[]) {
  return `${JSON.stringify({ schemaVersion: DIFF_REPORT_SCHEMA_VERSION, items }, null, 2)}\n`
}
