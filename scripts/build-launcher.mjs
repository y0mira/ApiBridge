import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const launcher = join(root, 'launcher')
const embeddedWeb = join(launcher, 'web')
const release = join(root, 'release')

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('dist/index.html is missing. Run npm run build:web first.')
}

for (const entry of readdirSync(embeddedWeb)) {
  if (entry !== 'README.txt') rmSync(join(embeddedWeb, entry), { recursive: true, force: true })
}
cpSync(dist, embeddedWeb, { recursive: true })
mkdirSync(release, { recursive: true })

const result = spawnSync(
  process.platform === 'win32' ? 'go.exe' : 'go',
  ['build', '-trimpath', '-ldflags', '-s -w', '-o', join(release, 'API-Bridge.exe'), '.'],
  {
    cwd: launcher,
    env: { ...process.env, CGO_ENABLED: '0', GOOS: 'windows', GOARCH: 'amd64' },
    stdio: 'inherit',
  },
)
if (result.status !== 0) process.exit(result.status ?? 1)

copyFileSync(join(root, 'web.config.json'), join(release, 'web.config.json'))
console.log(`Created ${join(release, 'API-Bridge.exe')}`)
