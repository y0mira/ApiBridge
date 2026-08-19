import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['packages/cli/src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'packages/cli/dist',
  tsconfig: 'packages/cli/tsconfig.json',
  target: 'node20',
  external: ['jiti'],
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: false,
})
