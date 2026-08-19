# API Bridge

API Bridge 是一个本地优先的 OpenAPI 前端契约工作台。它在浏览器内导入和校验 OpenAPI 3.0/3.1，浏览 endpoint 与 schema，生成前端代码，并为后端未完成、响应不稳定和契约变化提供可复现的 Mock、Fixture、Diff 与真实响应校验。

## 隐私模型

规范文本、解析结果和最近选择只存入当前浏览器的 IndexedDB。应用没有后端、遥测、远程 URL 抓取或上传行为。删除项目和清空数据都需要确认。静态构建可直接部署到 GitHub Pages。

## 开始使用

要求 Node.js 20.17 或更高版本。

```bash
npm install
npm run dev
```

打开页面后导入规范、选择 endpoint，再从右侧“打开工具”进入 Scenarios、Fixtures、Diff 和 Validate。工具页 URL 保存 project、operation 和当前工具，支持浏览器前进后退。

## 第二阶段工作流

- **Mock 场景**：每个 operation 有成功、空数据和常见错误预设；可自定义状态、headers、JSON/text body、0–30 秒延迟、网络失败及响应序列。场景具有稳定 ID且唯一默认，支持复制、排序、删除和未保存离开提示。
- **Fixture**：使用固定 seed 和稳定 ID生成单个或列表数据，支持 overrides 和明确标记的边界/违约变体；可导出 JSON、TypeScript 常量和 `build`/`buildList` factory。
- **OpenAPI Diff**：当前项目作为 baseline，candidate 在 Web Worker 中解析比较；可导出顺序稳定的 Markdown/JSON 报告。
- **真实响应校验**：只处理粘贴的数据，不请求任意后端；报告 JSON Pointer、期望/实际值和建议，有效响应可保存为场景，导出前可递归脱敏。
- **主题与性能**：完整浅色/深色主题、reduced-motion、按需 Monaco、每批 200 个 endpoint 的分段渲染。

MSW 场景文件可独立放入业务项目，通过 `_scenario` query、`x-api-scenario` header、`API_SCENARIO` 环境变量或 `setApiScenario()` 选择场景，不依赖 API Bridge 页面运行。

## 验证命令

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 支持范围

- OpenAPI 3.0 和 3.1；JSON/YAML；最大 10 MiB。
- 本地 JSON Pointer `$ref`，并检测不可解析引用；外部引用显示 warning，不发起网络请求。
- 参数位置：path、query、header、cookie；JSON request/response schema。
- Schema：object、array、required/optional、nullable、enum、dictionary、oneOf、anyOf、allOf 和递归组件引用。
- Zod：object、array、enum、literal、union、intersection、递归 `z.lazy`，以及常用 number/string constraints。
- MSW 2.x：每个 operation 一个成功 handler；按 examples、example、确定性 schema 示例的顺序生成响应。
- 客户端：原生 fetch、注入 Axios instance、TanStack Query v5 option factories；包含参数序列化、base URL/headers 注入、AbortSignal 和最小类型化错误。
- 输出排序稳定，相同输入和选择产生字节级一致结果。

无法精确映射的结构会生成 `unknown` 或 `z.unknown()` 并显示 warning，不会静默使用 `any`。生成文件假设业务项目已安装 `zod` 或 `msw`。

## 架构

- `src/core/parser.ts`：格式解析、OpenAPI 基础校验、引用检查和 operation 规范化。
- `src/core/generator.ts`、`client-generator.ts`：TypeScript、Zod、MSW、fetch、Axios 和 Query options 的确定性生成。
- `src/core/scenarios.ts`、`fixtures.ts`、`validator.ts`：场景、Fixture 和真实响应校验。
- `src/core/diff.ts`、`src/workers/diff.worker.ts`：确定性契约 Diff 与后台执行。
- `src/core/db.ts`：v3 IndexedDB 项目、场景和版本存储；升级只增加索引，不删除旧数据。
- `src/App.tsx`、`src/components/WorkflowWorkbench.tsx`：契约浏览和第二阶段工具。
- `src/components/SchemaTree.tsx`：可展开 schema tree 与路径复制。
- `src/**/*.test.ts(x)`、`e2e/`：单元、组件、持久化和浏览器主流程测试。

## 已知限制

- 不解析外部或远程 `$ref`；不执行完整 OpenAPI Schema 方言验证。
- 不在浏览器中请求任意后端；真实响应必须粘贴或导入。
- TanStack Query 生成的是 v5 option factories，而不是 hooks，便于业务项目按自己的组件边界组合。
- 不生成业务认证逻辑；fetch headers 和 Axios instance 是明确注入点。
- 暂不实现 CLI、复杂 Faker 数据工厂或 Postman 式通用请求客户端。
- Zod 只映射明确支持的约束；其余约束会产生 warning。
- 项目数据跟随浏览器站点存储，清除站点数据后无法恢复。
