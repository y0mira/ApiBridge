import ts from 'typescript'

export function compileTypeScript(files: Record<string, string>) {
  const root = process.cwd().replaceAll('\\', '/')
  const virtual = new Map(
    Object.entries(files).map(([name, content]) => [`${root}/generated/${name}`, content]),
  )
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
    names.map((name) => {
      const relative = name.startsWith('./') ? `${root}/generated/${name.slice(2)}.ts` : undefined
      return relative && virtual.has(relative)
        ? { resolvedFileName: relative, extension: ts.Extension.Ts }
        : ts.resolveModuleName(name, containingFile, options, host).resolvedModule
    })
  const program = ts.createProgram([...virtual.keys()], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n'))
}
