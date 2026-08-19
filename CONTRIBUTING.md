# Contributing

Thanks for helping improve API Bridge. Use Node.js 20.17 or newer and start from a focused issue.

```bash
npm ci
npx playwright install chromium
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run pack:smoke
```

Keep core logic environment-neutral and expose it through `src/core/index.ts`. Web and CLI changes must share parser, generator, fixture, Diff, and validation behavior. Add deterministic tests for behavior or generated-byte changes. Do not commit generated build output, downloaded fixtures, credentials, or local configuration.

Pull requests should explain motivation, compatibility impact, generated-output changes, and actual tests. By participating, you agree to follow the Code of Conduct.
