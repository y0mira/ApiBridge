# API Bridge

[中文](./README.md)

API Bridge is a local-first OpenAPI frontend contract tool. The Web workbench covers browsing, mocks, fixtures, Diff, and response validation; the CLI brings the same deterministic generators and rules into repositories and CI. Specifications, fixtures, responses, and settings stay on the user's device. There is no upload, telemetry, or remote URL fetching.

> Live demo: not deployed yet. The Pages workflow supplies the real URL after GitHub Pages is enabled.
>
> Screenshot: add a sanitized real product screenshot here before release; the repository does not include a fabricated image.

## Requirements and Web quick start

Node.js 20.17 or newer is required. Node 18 is not supported.

```bash
npm ci
npm run dev
```

Then open `http://127.0.0.1:5173`. Change `host`, `port`, or `previewPort` in the repository-root [`web.config.json`](./web.config.json), then restart the server.

## Windows single-file launcher

With Go 1.22+ installed, run `npm run build:launcher`. The result is `release/API-Bridge.exe` plus `release/web.config.json`. The exe embeds the production Web build and requires no Node.js, npm, or Go installation on the target machine. Keep the optional config next to the exe and double-click it to start the local server and open the default browser. Without the config it uses `127.0.0.1:59116`.

Import a local OpenAPI JSON/YAML document, select endpoints, then generate code or open Scenarios, Fixtures, Diff, and Validate. “中文 / English” switches without a reload. Language is stored in localStorage; projects and scenarios are stored in IndexedDB.

Build the static site with `npm run build:web`. The resulting `dist/` works on static hosting. GitHub Pages receives a repository base path from [pages.yml](./.github/workflows/pages.yml). `_headers` documents CSP/security headers for compatible hosts; an HTML CSP meta covers GitHub Pages, which cannot set custom response headers.

## CLI quick start

```bash
npm install --save-dev @api-bridge/cli
npx api-bridge check ./openapi.yaml
npx api-bridge generate ./openapi.yaml --output ./src/api
npx api-bridge diff ./baseline.yaml ./candidate.yaml --format markdown
npx api-bridge validate-response ./openapi.yaml --operation getUsers --status 200 --input response.json
```

Select targets with `--targets typescript,zod,msw,fetch,axios,query`. `--dry-run` reports only; `--check` detects stale output without writing; `--json` is the stable machine interface. Exit codes are `0` success, `1` usage/I/O/parse failure, and `2` contract validation failure, breaking Diff, or stale generated output.

`api-bridge.config.ts` supports `schemaVersion: '1.0.0'`, `input`, `output`, and `targets`. Precedence is CLI flags > config > defaults. The CLI reads local JSON/YAML only. It generates everything in memory, stages a complete directory, retains user files, replaces only files managed by the previous manifest, and commits by rename. The versioned manifest contains tool/core versions, input basename and SHA-256, configuration summary, and managed files—never secrets, timestamps, or absolute paths.

## Generated targets

| Target         | File                   | Compatibility                       |
| -------------- | ---------------------- | ----------------------------------- |
| TypeScript     | `api-types.ts`         | TypeScript 5.x                      |
| Zod            | `api-schemas.ts`       | Zod 3.24+                           |
| MSW            | `api-handlers.ts`      | MSW 2.x                             |
| Fetch          | `api-fetch.ts`         | Standards-based fetch / AbortSignal |
| Axios          | `api-axios.ts`         | Injected Axios 1.x instance         |
| TanStack Query | `api-query-options.ts` | v5 option factories                 |

Outputs use stable ordering and LF newlines. Headers contain only the source basename and “Do not edit,” without timestamps or absolute paths. Authentication remains an explicit injection point. See [generator compatibility](./docs/generator-compatibility.md).

## Web capabilities

- OpenAPI 3.0/3.1 JSON/YAML up to 10 MiB, local `$ref`, parameters, request/response schemas.
- Deterministic TypeScript, Zod, MSW, fetch, Axios, and Query generation.
- Named success/error/delay/network/sequence mock scenarios and deterministic fixtures.
- Stable breaking/warning/info OpenAPI Diff reports in Markdown and JSON.
- Local real-response validation, JSON Pointer diagnostics, scenario save, and redaction.
- Light/dark themes, Chinese/English, deep links, keyboard focus, reduced motion, and responsive layouts.

## CI, packaging, and release

Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`, `npm run pack:smoke`, and `npm run benchmark`. CI runs the full suite on Ubuntu and CLI/tarball smoke tests on Windows, Ubuntu, and macOS. A copyable consumer workflow is in [docs/examples](./docs/examples/api-contract.github-actions.yml).

The release workflow creates a Web zip, core/CLI tarballs, and SHA-256 checksums. It does not publish npm packages. Build and inspect tarballs with `npm pack --workspace @api-bridge/core` and `npm pack --workspace @api-bridge/cli`; only an authorized maintainer should later run `npm publish <tarball> --access public`.

## Architecture, security, and limits

Web and CLI import the public API in `src/core/index.ts`; `packages/core` packages that environment-neutral API, while `packages/cli` contains Node-only I/O. Core API, manifest, and JSON Diff report schemas are versioned `1.0.0`; unknown major versions are rejected. During `0.x`, breaking API or generated-byte changes require a minor release and changelog entry. See [architecture](./docs/architecture.md) and [Diff rules](./docs/diff-rules.md).

Imported content is parsed as JSON/YAML and rendered as escaped text, never executed. The product has no backend, telemetry, authentication proxy, arbitrary HTTP client, AI repair, account/team/cloud features, VS Code plugin, or remote specification fetching. External `$ref` is not fetched, schema dialect validation is intentionally partial, and browser data is lost when site storage is cleared.

Chromium is automated locally. Firefox/WebKit are not yet verified. Windows CLI is locally verified; Linux/macOS are only considered verified after their CI jobs actually run. Node 20+ is supported; repository development requires 20.17+.

API Bridge is available under the [MIT License](./LICENSE). See [CONTRIBUTING](./CONTRIBUTING.md), [Code of Conduct](./CODE_OF_CONDUCT.md), [Security](./SECURITY.md), and [Changelog](./CHANGELOG.md).
