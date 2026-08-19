# Generator compatibility

| Target         | Output                 | Runtime expectation                                       |
| -------------- | ---------------------- | --------------------------------------------------------- |
| TypeScript     | `api-types.ts`         | TypeScript 5.x                                            |
| Zod            | `api-schemas.ts`       | Zod 3.24+                                                 |
| MSW            | `api-handlers.ts`      | MSW 2.x                                                   |
| Fetch          | `api-fetch.ts`         | Standards-based `fetch`, `URLSearchParams`, `AbortSignal` |
| Axios          | `api-axios.ts`         | Injected Axios 1.x instance                               |
| TanStack Query | `api-query-options.ts` | `@tanstack/react-query` 5.x option factories              |

All targets consume the same normalized operations and are emitted in stable filename/content order with LF newlines. CLI-generated files contain a source basename and “Do not edit” marker, but no timestamp or absolute path. Business authentication is intentionally left as an injection point.

The supported schema subset is documented in the main README. Unknown structures become `unknown`/`z.unknown()` with warnings rather than implicit `any`.
