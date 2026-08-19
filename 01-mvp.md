# 第一阶段提示词：从 OpenAPI 到前端代码的 MVP

你是一名资深前端工具链工程师。请在当前空仓库中实现 `API Bridge` 第一阶段 MVP。你可以创建文件、安装依赖、运行构建和测试。不要只给教程或代码片段；持续工作到验收标准满足，或明确报告无法解决的外部阻塞。

## 1. 产品目标

API Bridge 帮助前端开发者把后端 OpenAPI 文档转换为可提交到业务项目的前端代码。本阶段只完成以下闭环：

```text
导入 OpenAPI JSON/YAML
        -> 校验并浏览 endpoints/schema
        -> 选择接口
        -> 生成 TypeScript 类型、Zod schema、MSW handlers
        -> 浏览器下载生成文件
```

## 2. 技术栈与边界

- React、TypeScript strict、Vite、React Router、TanStack Query、Tailwind CSS。
- Monaco Editor 用于查看和编辑 OpenAPI 及生成代码。
- 使用成熟的 OpenAPI 解析库，支持 OpenAPI 3.0 和 3.1 JSON/YAML。
- 数据保存在 IndexedDB；文件解析和代码生成在浏览器本地完成，不上传服务器。
- 项目构建产物必须是纯静态站点，可部署到 GitHub Pages。
- 测试使用 Vitest、Testing Library、Playwright。
- 不实现账号、云同步、团队协作、后端服务、通用 API 请求客户端、GraphQL、gRPC、WebSocket、AI 生成或 CLI。
- 不自己实现完整 YAML/OpenAPI parser，不为单个实现创建无意义抽象层。

## 3. 导入与项目模型

支持以下导入方式：

- 选择本地 `.json`、`.yaml`、`.yml` 文件。
- 粘贴 OpenAPI 文本。
- 拖拽文件。
- 提供一个内置、明确标注为示例的最小 Petstore 文档；不得把它伪装成真实用户数据。

第一版不从远程 URL 拉取文档，避免 CORS、认证与 SSRF 范围扩张。

每个本地项目至少保存：

- `id`
- `name`
- `sourceFormat`
- 原始规范文本
- 解析后的规范版本
- `createdAt`、`updatedAt`
- 最近选择的 operation

解析要求：

- 拒绝非 OpenAPI 3.0/3.1 文档。
- 显示可定位的 YAML/JSON 语法错误。
- 显示缺失 `info`、`paths`、operationId 冲突和无法解析 `$ref` 等问题。
- 区分 error 与 warning；存在 warning 时允许继续，存在阻塞 error 时禁止生成。
- 限制导入大小，默认 10 MiB；超限给出清楚提示。
- 解析失败不得破坏上一次已保存的有效版本。

## 4. Endpoint 与 Schema 浏览

工作台至少包含：

- 按 tag 分组的 endpoint 列表。
- 按 path、operationId、summary 搜索。
- HTTP method、path、summary、deprecated 状态。
- 参数列表：path、query、header、cookie、request body。
- response 状态码、content type 和 schema。
- 可展开的 schema tree，能处理 object、array、enum、nullable、oneOf、anyOf、allOf 和递归引用。
- 点击 schema 字段可以复制 JSON Pointer 或可读路径。

必须对没有 `operationId` 的接口生成稳定的内部标识，但不得静默写回或改变用户原始文档。

## 5. 代码生成

为用户选择的一个或多个 operation 生成以下内容：

### TypeScript 类型

- 请求 path/query/header/body 类型。
- 各 response 状态码的 body 类型。
- 复用 components/schemas，避免相同模型重复输出。
- 必填和可选正确区分。
- 保留 enum；正确处理 nullable、array、dictionary、union、intersection。
- 对无法安全表示的结构输出清晰 warning，不得偷偷使用错误类型。
- `additionalProperties: true` 可使用 `Record<string, unknown>`，禁止无理由使用 `any`。

### Zod schema

- 生成与 TypeScript 对应的 Zod schema。
- 正确区分 optional 与 nullable。
- 支持 object、array、enum、literal、union、intersection 和递归结构。
- 无法准确表示的 OpenAPI constraint 必须在结果旁显示 warning。

### MSW 2.x handlers

- 使用 `http`、`HttpResponse` 等 MSW 2.x API。
- 为每个 operation 生成一个默认成功响应。
- 优先使用 OpenAPI examples；其次使用 example；都没有时按 schema 生成最小、确定性的示例。
- 生成内容应可格式化、可复制、可分别下载。
- 生成文件必须拥有稳定顺序，相同输入和设置产生字节级一致的输出。

第一阶段不生成 Axios、TanStack Query hooks 或复杂数据工厂。

## 6. UI 结构

采用高信息密度开发者工作台：

```text
+----------------+---------------------------+------------------------------+
| Projects       | Endpoints / Schemas       | Inspector / Generated code   |
| import/history | search + grouped list     | tabs + warnings + download   |
+----------------+---------------------------+------------------------------+
```

- 桌面端三栏；1024px 以下转换为两层导航；375px 下可完成导入、选接口和下载代码。
- 页面不能出现整体横向滚动，代码编辑器自身可横向滚动。
- 所有表单使用可见标签；焦点状态清楚；关键操作键盘可达。
- 使用 Lucide 等 SVG 图标，不使用 emoji 作为图标。
- 提供明确的初始空状态、解析中、解析失败、无 endpoint 和生成失败状态。
- 第一阶段只做清晰实用的基础样式，不引入大面积渐变、玻璃拟态、无意义图表和装饰动画。

## 7. 状态与数据安全

- 原始规范、解析结果和用户选择只保存在本机浏览器。
- 提供删除单个项目和清空本地数据；危险操作需要确认。
- 不记录或上传用户规范内容，不引入遥测。
- IndexedDB schema 带显式版本；升级失败需保留原数据并给出恢复建议。
- 从文件读取的内容必须作为文本/数据展示，禁止执行 HTML 或脚本。

## 8. 测试要求

至少覆盖：

- JSON、YAML 导入成功。
- 非法 YAML、错误 OpenAPI 版本、未解析 `$ref` 和超大文件失败。
- warning 不阻塞生成，error 阻塞生成。
- required、optional、nullable、enum、array、dictionary、oneOf、allOf、recursive schema 的生成快照或语义测试。
- MSW 2.x 输出可被 TypeScript 编译。
- 相同输入生成稳定输出。
- IndexedDB 保存、恢复和删除项目。
- 关键组件：空状态、导入错误、endpoint 搜索、选择接口、代码复制和下载。
- Playwright 主流程：导入 fixture OpenAPI -> 选择 endpoint -> 生成三类代码 -> 下载文件。
- 375、768、1024、1440 宽度检查，无阻塞性溢出。

测试 fixture 放入仓库，禁止依赖网络、当前时间、随机数和第三方在线 Petstore。

## 9. 文档与开发体验

提供：

- README：定位、功能、隐私模型、支持范围、启动/测试/构建命令、示例流程和已知限制。
- `.gitignore`、`.editorconfig`、锁文件、ESLint、Prettier。
- `npm run dev`、`npm run build`、`npm run lint`、`npm run typecheck`、`npm run test`、`npm run test:e2e`。
- 架构说明保持简短，只描述实际存在的模块。

## 10. 执行顺序

1. 检查当前目录，说明关键假设和简短计划。
2. 建立最小项目并先确保 lint、typecheck、build 可运行。
3. 先实现 parser 与规范化内部模型，再做生成器和 UI。
4. 每个生成器先用 fixture 和测试明确行为。
5. 完成 UI 后运行 Playwright 和响应式检查。
6. 修复失败直到验收通过。
7. 检查 Git diff，排除构建产物、本地数据库、下载文件和无关修改。

## 11. 完成标准

- 新用户能按 README 启动纯前端应用。
- 有效 OpenAPI 可导入、保存、恢复和浏览。
- 选择 endpoint 后能生成可编译的 TypeScript、Zod 和 MSW 2.x 文件。
- 错误文档不会导致白屏或覆盖有效数据。
- 核心流程在桌面和手机宽度都可操作。
- lint、typecheck、unit、build、Playwright 全部实际通过。
- 没有伪实现、TODO 占位、硬编码完成状态或未使用的大型依赖。

完成后报告：实现摘要、实际执行命令和结果、项目结构、生成器支持矩阵、已知限制和下一阶段建议。不要声称没有运行的测试通过。
