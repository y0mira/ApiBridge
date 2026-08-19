# Architecture

API Bridge is a static React Web application plus two npm workspaces and a thin optional Go launcher.

```text
Web (React/Vite) ─┐
                  ├─ src/core/index.ts ─ parser/model/generators/fixture/diff/validator
CLI (Node 20+) ───┘
Go launcher ─────── embeds the Web dist and serves it on loopback
```

`@api-bridge/core` bundles the public API from `src/core/index.ts`. It has no DOM, React, IndexedDB, or Node filesystem dependency. IndexedDB and the Diff Worker remain Web adapters. `@api-bridge/cli` supplies local-file I/O, configuration, atomic managed-directory replacement, manifest creation, terminal/JSON output, and exit-code policy.

The Go launcher contains no OpenAPI or generator logic. It embeds the same Vite `dist/`, reads an optional adjacent `web.config.json`, serves static files with SPA fallback, and opens the system browser. Development Vite and the launcher share the checked-in host/port configuration.

Core API, manifest, and JSON Diff report schemas each carry an explicit `1.0.0` version. Consumers must reject unknown major versions. During `0.x`, a breaking public-API or generated-output change requires a minor release and changelog entry; deprecated exports remain for at least one minor release where practical.

The CLI creates all files in a staging directory. Existing output is copied, only files listed by the prior manifest are replaced, user files are retained, and a directory rename commits the result. A failed commit restores the previous directory.
