import { resolveRef } from './parser'
import type { BoundaryVariant, FixtureOptions, OpenApiDocument, Schema } from './types'

function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}
const variantValue = (variant: BoundaryVariant, schema: Schema) => {
  switch (variant) {
    case 'empty-string':
      return ''
    case 'null':
      return null
    case 'zero':
      return 0
    case 'negative':
      return -1
    case 'long-text':
      return 'x'.repeat(1024)
    case 'unicode':
      return '你好 · مرحبا · 🌍'
    case 'empty-array':
      return []
    case 'large-list':
      return Array.from({ length: 100 }, (_, index) => index)
    case 'min-date':
      return schema.format === 'date' ? '0001-01-01' : '0001-01-01T00:00:00.000Z'
    case 'max-date':
      return schema.format === 'date' ? '9999-12-31' : '9999-12-31T23:59:59.999Z'
    case 'unknown-enum':
      return '__UNKNOWN_ENUM__'
  }
}

export function isVariantAllowed(variant: BoundaryVariant, schema: Schema, intentional = false) {
  if (intentional) return true
  if (variant === 'null')
    return schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'))
  if (variant === 'unknown-enum') return !Array.isArray(schema.enum)
  if (variant === 'negative')
    return (
      (schema.type === 'number' || schema.type === 'integer') &&
      (schema.minimum === undefined || Number(schema.minimum) < 0)
    )
  if (
    variant === 'empty-string' ||
    variant === 'long-text' ||
    variant === 'unicode' ||
    variant === 'min-date' ||
    variant === 'max-date'
  )
    return schema.type === 'string'
  if (variant === 'zero') return schema.type === 'number' || schema.type === 'integer'
  if (variant === 'empty-array' || variant === 'large-list')
    return schema.type === 'array' || !!schema.items
  return false
}

function build(
  schema: Schema | undefined,
  document: OpenApiDocument,
  random: () => number,
  index: number,
  variants: Record<string, BoundaryVariant>,
  pointer = '#',
  seen = new Set<string>(),
): unknown {
  if (!schema) return null
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) return null
    seen.add(schema.$ref)
    return build(
      resolveRef(document, schema.$ref) as Schema,
      document,
      random,
      index,
      variants,
      pointer,
      seen,
    )
  }
  const variant = variants[pointer]
  if (variant && isVariantAllowed(variant, schema)) return variantValue(variant, schema)
  if (Array.isArray(schema.enum) && schema.enum.length)
    return schema.enum[Math.floor(random() * schema.enum.length)]
  if (Array.isArray(schema.oneOf) && schema.oneOf.length)
    return build(schema.oneOf[0] as Schema, document, random, index, variants, pointer, seen)
  if (Array.isArray(schema.anyOf) && schema.anyOf.length)
    return build(schema.anyOf[0] as Schema, document, random, index, variants, pointer, seen)
  if (Array.isArray(schema.allOf))
    return Object.assign(
      {},
      ...schema.allOf.map((part) =>
        build(part as Schema, document, random, index, variants, pointer, new Set(seen)),
      ),
    )
  if (schema.type === 'array' || schema.items)
    return [
      build(
        schema.items as Schema,
        document,
        random,
        index,
        variants,
        `${pointer}/0`,
        new Set(seen),
      ),
    ]
  if (schema.type === 'object' || schema.properties)
    return Object.fromEntries(
      Object.entries((schema.properties as Record<string, Schema>) ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, child]) => [
          name,
          name === 'id'
            ? `fixture-${index + 1}`
            : build(child, document, random, index, variants, `${pointer}/${name}`, new Set(seen)),
        ]),
    )
  if (schema.type === 'string')
    return schema.format === 'date'
      ? '2020-01-01'
      : schema.format === 'date-time'
        ? '2020-01-01T00:00:00.000Z'
        : `value-${Math.floor(random() * 10000)}`
  if (schema.type === 'integer') return Math.floor(random() * 100)
  if (schema.type === 'number') return Number((random() * 100).toFixed(2))
  if (schema.type === 'boolean') return random() >= 0.5
  return null
}

export function generateFixture(
  schema: Schema | undefined,
  document: OpenApiDocument,
  options: FixtureOptions,
) {
  const random = rng(options.seed)
  return Array.from({ length: Math.max(1, Math.min(options.count, 1000)) }, (_, index) => {
    const value = build(schema, document, random, index, options.variants ?? {})
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>), ...options.overrides }
      : value
  })
}

export function generateIntentionalVariant(schema: Schema, variant: BoundaryVariant) {
  return {
    value: variantValue(variant, schema),
    violatesContract: !isVariantAllowed(variant, schema),
    variant,
  }
}

export function fixtureExports(name: string, values: unknown[]) {
  const safe = name.replace(/[^a-zA-Z0-9_$]/g, '') || 'fixture'
  const json = `${JSON.stringify(values, null, 2)}\n`
  const typescript = `export const ${safe} = ${JSON.stringify(values, null, 2)} as const\n`
  const factory = `const template = ${JSON.stringify(values[0] ?? {}, null, 2)}\nexport const build${safe} = (overrides = {}) => ({ ...template, ...overrides })\nexport const build${safe}List = (count, overrides = {}) => Array.from({ length: count }, (_, index) => build${safe}({ id: \`fixture-\${index + 1}\`, ...overrides }))\n`
  return { json, typescript, factory }
}
