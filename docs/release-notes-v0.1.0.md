# API Bridge v0.1.0 release notes (draft)

API Bridge v0.1.0 is the first open-source release candidate of the local-first OpenAPI frontend contract workbench.

## Highlights

- Import OpenAPI 3.0/3.1 JSON or YAML locally and browse endpoints and schemas.
- Generate deterministic TypeScript, Zod, MSW 2.x, fetch, Axios, and TanStack Query v5 files.
- Build named mock scenarios and deterministic fixtures; compare contract versions and validate pasted responses.
- Run the same core through the Node.js 20+ `api-bridge` CLI in local repositories and CI.
- Use the static Web interface in Chinese or English, light or dark mode.

## Packages and artifacts

- `@api-bridge/core@0.1.0`
- `@api-bridge/cli@0.1.0`
- Static Web zip and `SHA256SUMS`
- Windows `API-Bridge.exe` single-file Web launcher and editable `web.config.json`
- GitHub-generated source archives

No npm package has been published as part of repository validation. Maintainers must inspect the locally verified tarballs and explicitly publish them later.

## Compatibility and limits

Node.js 20+ is required. External `$ref`, arbitrary HTTP requests, remote specification fetching, authentication management, accounts, cloud sync, and AI repair are outside this release. See the README and generator compatibility document for the exact supported subset.
