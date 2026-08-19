export const CORE_API_VERSION = '1.0.0' as const
export const MANIFEST_SCHEMA_VERSION = '1.0.0' as const

export * from './types'
export { MAX_IMPORT_BYTES, parseOpenApi, resolveRef, stableOperationId } from './parser'
export { generateAll, generateMsw, generateTypes, generateZod } from './generator'
export {
  generateAxiosClient,
  generateClients,
  generateFetchClient,
  generateQueryOptions,
} from './client-generator'
export { DIFF_REPORT_SCHEMA_VERSION, diffOpenApi, diffToJson, diffToMarkdown } from './diff'
export {
  fixtureExports,
  generateFixture,
  generateIntentionalVariant,
  isVariantAllowed,
} from './fixtures'
export { redactSensitive, validateValue } from './validator'
export {
  createPresetScenarios,
  createScenario,
  duplicateScenario,
  generateScenarioMsw,
  moveScenario,
  normalizeScenarios,
  sequenceStep,
  validateScenarioJson,
} from './scenarios'

export function assertCompatibleMajor(version: string, supportedMajor = 1) {
  const major = Number(version.split('.')[0])
  if (!Number.isInteger(major) || major !== supportedMajor)
    throw new Error(`Unsupported schema major version: ${version}. Expected ${supportedMajor}.x.`)
}
