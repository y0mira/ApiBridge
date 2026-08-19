export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type Schema = Record<string, unknown>
export type OpenApiDocument = {
  openapi: string
  info: { title: string; version: string; [key: string]: unknown }
  paths: Record<string, Record<string, unknown>>
  components?: { schemas?: Record<string, Schema>; [key: string]: unknown }
  tags?: { name: string }[]
  [key: string]: unknown
}

export type Issue = { severity: 'error' | 'warning'; code: string; message: string; path?: string }
export type Parameter = {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  schema?: Schema
}
export type ResponseInfo = {
  status: string
  contentType: string
  schema?: Schema
  example?: unknown
}
export type Operation = {
  id: string
  operationId?: string
  method: string
  path: string
  summary: string
  tags: string[]
  deprecated: boolean
  parameters: Parameter[]
  body?: { required: boolean; contentType: string; schema?: Schema }
  responses: ResponseInfo[]
}
export type ParsedSpec = {
  document: OpenApiDocument
  version: string
  operations: Operation[]
  issues: Issue[]
}
export type Project = {
  id: string
  name: string
  sourceFormat: 'json' | 'yaml'
  source: string
  parsed: ParsedSpec
  createdAt: string
  updatedAt: string
  selectedOperationIds: string[]
}
export type GeneratedFile = {
  name: string
  language: 'typescript'
  content: string
  warnings: string[]
}

export type ScenarioBodyType = 'json' | 'text'
export type ScenarioFailure = 'none' | 'network-error' | 'connection-refused' | 'timeout'
export type ScenarioStep = { status: number; body: string; headers: Record<string, string> }
export type MockScenario = {
  id: string
  operationId: string
  name: string
  isDefault: boolean
  status: number
  headers: Record<string, string>
  bodyType: ScenarioBodyType
  body: string
  delayMs: number
  failure: ScenarioFailure
  sequence: ScenarioStep[]
}
export type SpecVersion = {
  id: string
  name: string
  source: string
  parsed: ParsedSpec
  createdAt: string
}
export type FixtureOptions = {
  seed: number
  count: number
  overrides?: Record<string, unknown>
  variants?: Record<string, BoundaryVariant>
}
export type BoundaryVariant =
  | 'empty-string'
  | 'null'
  | 'zero'
  | 'negative'
  | 'long-text'
  | 'unicode'
  | 'empty-array'
  | 'large-list'
  | 'min-date'
  | 'max-date'
  | 'unknown-enum'
export type ValidationIssue = {
  pointer: string
  expected: string
  actual: string
  message: string
  suggestion: string
}
export type DiffSeverity = 'breaking' | 'warning' | 'info'
export type DiffItem = {
  severity: DiffSeverity
  kind: string
  pointer: string
  before?: unknown
  after?: unknown
  reason: string
}
