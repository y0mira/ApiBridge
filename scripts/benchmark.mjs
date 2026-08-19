import { performance } from 'node:perf_hooks'
import { diffOpenApi, generateAll, parseOpenApi } from '../packages/core/dist/index.js'

const paths = Object.fromEntries(
  Array.from({ length: 3000 }, (_, index) => [
    `/items/${index}`,
    {
      get: {
        operationId: `getItem${index}`,
        responses: {
          200: {
            description: 'ok',
            content: { 'application/json': { schema: { type: 'string' } } },
          },
        },
      },
    },
  ]),
)
const source = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'benchmark', version: '1', description: 'x'.repeat(9 * 1024 * 1024) },
  paths,
})
const memoryBefore = process.memoryUsage().heapUsed
const parseStart = performance.now()
const parsed = parseOpenApi(source, 'benchmark.json')
const parseMs = performance.now() - parseStart
const diffStart = performance.now()
const diff = diffOpenApi(parsed.document, parsed.operations, parsed.document, parsed.operations)
const diffMs = performance.now() - diffStart
const generateStart = performance.now()
const files = generateAll(parsed.document, parsed.operations.slice(0, 500))
const generateMs = performance.now() - generateStart
const memoryAfter = process.memoryUsage().heapUsed

process.stdout.write(
  `${JSON.stringify(
    {
      environment: { platform: process.platform, arch: process.arch, node: process.version },
      input: {
        bytes: Buffer.byteLength(source),
        operations: parsed.operations.length,
        generatedOperations: 500,
      },
      measurements: { parseMs, diffMs, generateMs, heapDeltaBytes: memoryAfter - memoryBefore },
      result: { diffItems: diff.length, files: files.length },
    },
    null,
    2,
  )}\n`,
)
