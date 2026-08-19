import { describe, expect, it } from 'vitest'
import {
  CORE_API_VERSION,
  DIFF_REPORT_SCHEMA_VERSION,
  MANIFEST_SCHEMA_VERSION,
  assertCompatibleMajor,
  generateAll,
  parseOpenApi,
} from './index'
import { FEATURE_SPEC } from '../test/fixtures'

describe('core public API contract', () => {
  it('exposes explicit stable schema versions', () => {
    expect({ CORE_API_VERSION, MANIFEST_SCHEMA_VERSION, DIFF_REPORT_SCHEMA_VERSION }).toEqual({
      CORE_API_VERSION: '1.0.0',
      MANIFEST_SCHEMA_VERSION: '1.0.0',
      DIFF_REPORT_SCHEMA_VERSION: '1.0.0',
    })
    expect(() => assertCompatibleMajor('2.0.0')).toThrow(/Unsupported schema major/)
  })

  it('is the shared parser and generator entry point', () => {
    const parsed = parseOpenApi(FEATURE_SPEC)
    expect(generateAll(parsed.document, parsed.operations).map((file) => file.name)).toEqual([
      'api-types.ts',
      'api-schemas.ts',
      'api-handlers.ts',
      'api-fetch.ts',
      'api-axios.ts',
      'api-query-options.ts',
    ])
  })
})
