import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('npm_execpath is unavailable; run this script through npm.')
const root = await mkdtemp(join(tmpdir(), 'api-bridge-pack-'))
const artifacts = join(root, 'artifacts')
const project = join(root, 'consumer')

function command(file, args, options = {}) {
  return execFileSync(file, args, { cwd: project, encoding: 'utf8', stdio: 'pipe', ...options })
}

function npmCommand(args, options = {}) {
  return command(process.execPath, [npmCli, ...args], options)
}

function runCli(args, expected = 0) {
  const bin = join(project, 'node_modules', '@api-bridge', 'cli', 'dist', 'index.js')
  const result = spawnSync(process.execPath, [bin, ...args], { cwd: project, encoding: 'utf8' })
  if (result.status !== expected)
    throw new Error(
      `CLI ${args.join(' ')} exited ${result.status}; stdout=${result.stdout}; stderr=${result.stderr}`,
    )
  return result
}

try {
  await import('node:fs/promises').then(({ mkdir }) =>
    Promise.all([mkdir(artifacts), mkdir(project)]),
  )
  const packed = JSON.parse(
    npmCommand(
      [
        'pack',
        '--workspace',
        '@api-bridge/core',
        '--workspace',
        '@api-bridge/cli',
        '--json',
        '--pack-destination',
        artifacts,
      ],
      { cwd: resolve('.') },
    ),
  )
  const tarballs = packed.map((item) => join(artifacts, item.filename))
  npmCommand(['init', '--yes'])
  npmCommand(['install', '--ignore-scripts', ...tarballs])
  const spec = join(project, 'openapi.yaml')
  const candidate = join(project, 'candidate.yaml')
  const response = join(project, 'response.json')
  const generated = join(project, 'src', 'api')
  const source = `openapi: 3.1.0
info: { title: Pack smoke, version: 1.0.0 }
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { type: array, items: { type: string } }
`
  await writeFile(spec, source)
  await writeFile(candidate, source.replace('/users:', '/people:'))
  await writeFile(response, '["Ada"]')
  runCli(['--version'])
  runCli(['check', spec, '--json'])
  runCli(['generate', spec, '--output', generated, '--dry-run', '--json'])
  runCli([
    'generate',
    spec,
    '--output',
    generated,
    '--targets',
    'typescript,zod,msw,fetch,axios,query',
  ])
  runCli([
    'generate',
    spec,
    '--output',
    generated,
    '--targets',
    'typescript,zod,msw,fetch,axios,query',
    '--check',
  ])
  runCli(['diff', spec, candidate, '--format', 'json'], 2)
  runCli([
    'validate-response',
    spec,
    '--operation',
    'getUsers',
    '--status',
    '200',
    '--input',
    response,
    '--json',
  ])
  const generatedFile = join(generated, 'api-types.ts')
  await writeFile(generatedFile, `${await readFile(generatedFile, 'utf8')}// stale\n`)
  const staleBefore = await readFile(generatedFile, 'utf8')
  runCli(
    [
      'generate',
      spec,
      '--output',
      generated,
      '--targets',
      'typescript,zod,msw,fetch,axios,query',
      '--check',
    ],
    2,
  )
  if ((await readFile(generatedFile, 'utf8')) !== staleBefore)
    throw new Error('generate --check modified a managed file.')
  command(process.execPath, [
    '--input-type=module',
    '--eval',
    "import('@api-bridge/core').then(m => { if (m.CORE_API_VERSION !== '1.0.0') process.exit(1) })",
  ])
  process.stdout.write(
    `${JSON.stringify({ ok: true, platform: process.platform, node: process.version, tarballs: packed.map((item) => ({ filename: item.filename, size: item.size, integrity: item.integrity })) }, null, 2)}\n`,
  )
} finally {
  await rm(root, { recursive: true, force: true })
}
