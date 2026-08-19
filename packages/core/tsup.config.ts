import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/core/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'packages/core/dist',
  tsconfig: 'tsconfig.app.json',
  target: 'es2022',
  sourcemap: false,
})
