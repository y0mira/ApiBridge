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
export type Parameter = { name: string; in: 'path' | 'query' | 'header' | 'cookie'; required: boolean; schema?: Schema }
export type ResponseInfo = { status: string; contentType: string; schema?: Schema; example?: unknown }
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
export type ParsedSpec = { document: OpenApiDocument; version: string; operations: Operation[]; issues: Issue[] }
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
export type GeneratedFile = { name: string; language: 'typescript'; content: string; warnings: string[] }
