import { describe, expect, it } from 'vitest'
import {
  fixtureExports,
  generateFixture,
  generateIntentionalVariant,
  isVariantAllowed,
} from './fixtures'
import { parseOpenApi } from './parser'
import { FEATURE_SPEC } from '../test/fixtures'

const parsed = parseOpenApi(FEATURE_SPEC)
const schema = parsed.document.components!.schemas!.Node
describe('fixture generator', () => {
  it('is stable by seed, supports count, stable ids and overrides', () => {
    const options = { seed: 42, count: 3, overrides: { label: 'override' } }
    const first = generateFixture(schema, parsed.document, options)
    expect(first).toEqual(generateFixture(schema, parsed.document, options))
    expect(first).toHaveLength(3)
    expect(first[0]).toMatchObject({ id: 'fixture-1', label: 'override' })
  })
  it('only creates allowed boundary variants unless explicitly marked', () => {
    expect(isVariantAllowed('null', { type: 'string', nullable: true })).toBe(true)
    expect(isVariantAllowed('unknown-enum', { type: 'string', enum: ['a'] })).toBe(false)
    expect(
      generateIntentionalVariant({ type: 'string', enum: ['a'] }, 'unknown-enum'),
    ).toMatchObject({ value: '__UNKNOWN_ENUM__', violatesContract: true })
  })
  it('exports stable JSON, TypeScript, factory and buildList', () => {
    const output = fixtureExports('NodeFixture', [{ id: 'fixture-1' }])
    expect(output.json).toContain('fixture-1')
    expect(output.typescript).toContain('as const')
    expect(output.factory).toContain('buildNodeFixtureList')
  })
})
