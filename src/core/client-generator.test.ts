import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { generateClients } from './client-generator'
import { parseOpenApi } from './parser'
import { FEATURE_SPEC } from '../test/fixtures'

describe('client generators', () => {
  const parsed = parseOpenApi(FEATURE_SPEC)
  const files = generateClients(parsed.operations)
  it('generates Axios, fetch and TanStack Query v5 option factories', () => {
    expect(files.map((file) => file.name)).toEqual([
      'api-fetch.ts',
      'api-axios.ts',
      'api-query-options.ts',
    ])
    expect(files[0].content).toContain('AbortSignal')
    expect(files[0].content).toContain('baseUrl')
    expect(files[1].content).toContain('AxiosInstance')
    expect(files[2].content).toContain('queryOptions')
  })
  it('all outputs parse as TypeScript', () => {
    for (const file of files)
      expect(
        ts.transpileModule(file.content, {
          reportDiagnostics: true,
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).diagnostics,
      ).toEqual([])
  })
  it('all outputs pass semantic TypeScript compilation together', () => {
    const root = process.cwd().replaceAll('\\', '/')
    const virtual = new Map(files.map((file) => [`${root}/generated/${file.name}`, file.content]))
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
    }
    const base = ts.createCompilerHost(options)
    const normalized = (name: string) => name.replaceAll('\\', '/')
    const host: ts.CompilerHost = {
      ...base,
      fileExists: (name) => virtual.has(normalized(name)) || base.fileExists(name),
      readFile: (name) => virtual.get(normalized(name)) ?? base.readFile(name),
      getSourceFile: (name, language) => {
        const text = virtual.get(normalized(name))
        return text === undefined
          ? base.getSourceFile(name, language)
          : ts.createSourceFile(name, text, language)
      },
    }
    host.resolveModuleNames = (names, containingFile) =>
      names.map((name) =>
        name === './api-fetch'
          ? { resolvedFileName: `${root}/generated/api-fetch.ts`, extension: ts.Extension.Ts }
          : ts.resolveModuleName(name, containingFile, options, host).resolvedModule,
      )
    const program = ts.createProgram([...virtual.keys()], options, host)
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([])
  })
})
