import { resolveRef } from './parser'
import type { OpenApiDocument, Schema, ValidationIssue } from './types'

const actualType = (value: unknown) =>
  value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
const escape = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1')

export function validateValue(
  value: unknown,
  schema: Schema | undefined,
  document: OpenApiDocument,
  pointer = '#',
  seen = new Set<string>(),
): ValidationIssue[] {
  if (!schema) return []
  if (typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) return []
    seen.add(schema.$ref)
    return validateValue(
      value,
      resolveRef(document, schema.$ref) as Schema | undefined,
      document,
      pointer,
      seen,
    )
  }
  const nullable =
    schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'))
  if (value === null)
    return nullable || schema.type === 'null'
      ? []
      : [
          {
            pointer,
            expected: 'non-null',
            actual: 'null',
            message: '字段不允许为 null。',
            suggestion: '提供符合 schema 的值，或将字段声明为 nullable。',
          },
        ]
  const expected = Array.isArray(schema.type)
    ? schema.type.filter((item) => item !== 'null')[0]
    : schema.type
  const type = actualType(value)
  const matches =
    !expected ||
    expected === type ||
    (expected === 'integer' && type === 'number' && Number.isInteger(value)) ||
    (expected === 'number' && type === 'number')
  if (!matches)
    return [
      {
        pointer,
        expected: String(expected),
        actual: type,
        message: `类型不匹配：期望 ${expected}，实际 ${type}。`,
        suggestion: `将值转换为 ${expected}。`,
      },
    ]
  const issues: ValidationIssue[] = []
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => Object.is(item, value)))
    issues.push({
      pointer,
      expected: `enum(${schema.enum.join(', ')})`,
      actual: JSON.stringify(value),
      message: '值不在允许的 enum 中。',
      suggestion: '使用 schema 声明的 enum 值。',
    })
  if (Array.isArray(value) && schema.items)
    value.forEach((item, index) =>
      issues.push(
        ...validateValue(
          item,
          schema.items as Schema,
          document,
          `${pointer}/${index}`,
          new Set(seen),
        ),
      ),
    )
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>
    const properties = (schema.properties as Record<string, Schema>) ?? {}
    const required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : [])
    for (const name of [...required].sort())
      if (!(name in object))
        issues.push({
          pointer: `${pointer}/${escape(name)}`,
          expected: 'required field',
          actual: 'missing',
          message: `缺少必填字段 ${name}。`,
          suggestion: `添加字段 ${name}。`,
        })
    for (const [name, child] of Object.entries(properties).sort(([a], [b]) => a.localeCompare(b)))
      if (name in object)
        issues.push(
          ...validateValue(
            object[name],
            child,
            document,
            `${pointer}/${escape(name)}`,
            new Set(seen),
          ),
        )
    if (schema.additionalProperties === false)
      for (const name of Object.keys(object)
        .filter((name) => !(name in properties))
        .sort())
        issues.push({
          pointer: `${pointer}/${escape(name)}`,
          expected: 'declared property',
          actual: 'additional field',
          message: `字段 ${name} 未在 schema 中声明。`,
          suggestion: '删除额外字段或允许 additionalProperties。',
        })
  }
  return issues
}

const SENSITIVE = /password|passwd|token|secret|authorization|api[-_]?key|cookie|email|phone/i
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        SENSITIVE.test(key) ? '[REDACTED]' : redactSensitive(child),
      ]),
    )
  return value
}
