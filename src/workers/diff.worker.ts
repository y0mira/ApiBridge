import { diffOpenApi } from '../core/diff'
import type { ParsedSpec } from '../core/types'

self.onmessage = (event: MessageEvent<{ baseline: ParsedSpec; candidate: ParsedSpec }>) => {
  const { baseline, candidate } = event.data
  self.postMessage(
    diffOpenApi(baseline.document, baseline.operations, candidate.document, candidate.operations),
  )
}
