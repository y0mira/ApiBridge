# API Bridge

API Bridge 是一个本地优先的 OpenAPI 前端代码生成工作台。它在浏览器内导入和校验 OpenAPI 3.0/3.1 JSON 或 YAML，浏览 endpoint 与 schema，并为选中的 operation 生成 TypeScript 类型、Zod schema 和 MSW 2.x handlers。

## 隐私模型

规范文本、解析结果和最近选择只存入当前浏览器的 IndexedDB。应用没有后端、遥测、远程 URL 抓取或上传行为。删除项目和清空数据都需要确认。静态构建可直接部署到 GitHub Pages。

## 开始使用

要求 Node.js 20.17 或更高版本。

```bash
npm install
npm run dev
```

打开页面后可选择 `.json`、`.yaml`、`.yml` 文件，粘贴文本，拖拽文件，或载入明确标记的内置 Petstore 示例。导入后搜索并勾选 endpoint，点击“生成代码”，然后在右栏编辑、复制或下载各文件。

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
- 输出排序稳定，相同输入和选择产生字节级一致结果。

无法精确映射的结构会生成 `unknown` 或 `z.unknown()` 并显示 warning，不会静默使用 `any`。生成文件假设业务项目已安装 `zod` 或 `msw`。

## 架构

- `src/core/parser.ts`：格式解析、OpenAPI 基础校验、引用检查和 operation 规范化。
- `src/core/generator.ts`：TypeScript、Zod 和 MSW 的确定性代码生成。
- `src/core/db.ts`：版本化 IndexedDB 项目存储。
- `src/App.tsx`：导入、项目历史、endpoint 工作台和 Monaco 编辑器。
- `src/components/SchemaTree.tsx`：可展开 schema tree 与路径复制。
- `src/**/*.test.ts(x)`、`e2e/`：单元、组件、持久化和浏览器主流程测试。

## 已知限制

- 不解析外部或远程 `$ref`；不执行完整 OpenAPI Schema 方言验证。
- 暂不生成 Axios、TanStack Query hooks、CLI、复杂 mock 数据工厂或通用 API 客户端。
- Zod 只映射明确支持的约束；其余约束会产生 warning。
- 项目数据跟随浏览器站点存储，清除站点数据后无法恢复。
