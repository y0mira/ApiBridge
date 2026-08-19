# API Bridge

[English](./README.en.md)

API Bridge 是一个本地优先的 OpenAPI 前端契约工作台，帮助前端开发者把 Swagger/OpenAPI 文档转换为可浏览、可验证、可生成代码的工程资产。

它由 Web 工作台、共享核心库、CLI 和 Windows 单文件启动器组成。Web 与 CLI 复用同一套解析、代码生成、Mock、Fixture、Diff 和响应校验逻辑。导入的规范、Fixture、真实响应、Mock 场景和配置均保存在用户设备中，不上传、不遥测，也不抓取远程 URL。

## 能做什么

- 浏览 OpenAPI 3.0/3.1 接口、参数、请求体、响应和 Schema。
- 生成 TypeScript、Zod、MSW、Fetch、Axios 和 TanStack Query 代码。
- 创建成功、空数据、错误、延迟、网络失败和响应序列等 Mock 场景。
- 生成确定性 Fixture，并导出 factory 或数据列表。
- 比较两个 OpenAPI 版本，识别 breaking、warning 和 info 变化。
- 根据指定 operation 和状态码校验真实 JSON 响应。
- 在 CLI 和 CI 中检查规范、破坏性变更及生成代码是否过期。

API Bridge 不是 Postman：它不负责发送业务请求、管理认证或代理 CORS。你可以从 Swagger UI 获取 OpenAPI JSON 和接口响应，再交给 API Bridge 在本地处理。

## 产品组成

```text
API Bridge
├── Web 工作台（React + Vite）
├── @api-bridge/core（Web 与 CLI 共享核心）
├── @api-bridge/cli（Node.js CLI）
└── API-Bridge.exe（内嵌 Web 的 Windows 启动器）
```

## 立即使用

Windows 用户可以从 [最新 Release](https://github.com/y0mira/ApiBridge/releases/latest) 下载：

- `API-Bridge.exe`：双击启动，无需安装 Node.js、npm 或 Go。
- `web.config.json`：与 exe 放在同一目录，用于修改端口和是否自动打开浏览器。

首次运行时，Windows 可能显示来源提示。确认文件来自本仓库 Release 后运行即可。默认访问地址为 `http://127.0.0.1:59116`。

文档：[操作手册](./docs/user-manual.md) · [完整项目介绍](./docs/project-introduction.md) · [架构](./docs/architecture.md) · [生成兼容矩阵](./docs/generator-compatibility.md)

## 要求与 Web 快速开始

Node.js 20.17 或更高版本（不支持 Node 18）。

```bash
npm ci
npm run dev
```

启动后访问 `http://127.0.0.1:5173`。开发服务器端口可在仓库根目录的 [`web.config.json`](./web.config.json) 中修改：

```json
{
  "host": "127.0.0.1",
  "port": 5173,
  "previewPort": 4173,
  "openBrowser": true
}
```

修改后重新启动服务。若要让局域网其他设备访问，可把 `host` 改为 `'0.0.0.0'`，并使用本机局域网 IP 打开页面。

浏览器中导入本地 OpenAPI JSON/YAML，选择 endpoint 后可生成代码或进入 Scenarios、Fixtures、Diff、Validate。顶栏可在“中文 / English”之间无刷新切换；选择保存在 localStorage，项目和场景保存在 IndexedDB。

`npm run build:web` 生成纯静态 `dist/`。GitHub Pages 使用 [pages.yml](./.github/workflows/pages.yml) 注入仓库子路径；其他静态平台可直接部署。支持 `_headers` 的平台会应用 CSP 示例；GitHub Pages 不支持自定义响应头，因此 `index.html` 另含 CSP meta。

本地验证生产构建：

```bash
npm run build:web
npm run preview:web
```

## Windows 单文件启动器

安装 Go 1.22+ 后运行：

```powershell
npm ci
npm run build:launcher
```

产物为 `release/API-Bridge.exe` 和 `release/web.config.json`。exe 已内嵌 Web production build，不要求目标电脑安装 Node.js、npm 或 Go。将这两个文件放在同一目录，双击 exe 会在配置的 `host`/`port` 启动本地服务并在 `openBrowser` 为 `true` 时打开默认浏览器；关闭控制台窗口即停止服务。

exe 旁没有 `web.config.json` 时使用 `127.0.0.1:59116` 并自动打开浏览器。端口被占用或配置无效时不会自动换端口，而是在控制台给出明确错误，避免书签和集成地址悄悄变化。启动器只提供内嵌静态站点，不复制 parser、生成器或工作流逻辑。

## CLI 快速开始

发布后安装包：

```bash
npm install --save-dev @api-bridge/cli
npx api-bridge check ./openapi.yaml
npx api-bridge generate ./openapi.yaml --output ./src/api
npx api-bridge diff ./baseline.yaml ./candidate.yaml --format markdown
npx api-bridge validate-response ./openapi.yaml --operation getUsers --status 200 --input response.json
```

生成目标可用 `--targets typescript,zod,msw,fetch,axios,query` 选择。`--dry-run` 只报告；`--check` 检测生成目录是否过期且绝不写文件；`--json` 提供稳定机器输出。退出码：`0` 成功，`1` 用法/I/O/解析失败，`2` 契约校验失败、breaking Diff 或生成结果过期。

配置文件 `api-bridge.config.ts`：

```ts
export default {
  schemaVersion: '1.0.0',
  input: './openapi.yaml',
  output: './src/api',
  targets: ['typescript', 'zod', 'fetch', 'query'],
}
```

优先级为 CLI 参数 > 配置文件 > 默认值。CLI 只处理本地 JSON/YAML。写入前先在内存生成全部文件，再通过 staging/rename 提交；只替换 manifest 中的管理文件，不删除用户文件。manifest 记录 schema/tool/core 版本、规范 basename 与 SHA-256、配置摘要和管理文件，不记录绝对路径、密钥或时间。

## 生成结果与兼容性

| 目标           | 文件                   | 兼容范围                 |
| -------------- | ---------------------- | ------------------------ |
| TypeScript     | `api-types.ts`         | TypeScript 5.x           |
| Zod            | `api-schemas.ts`       | Zod 3.24+                |
| MSW            | `api-handlers.ts`      | MSW 2.x                  |
| Fetch          | `api-fetch.ts`         | 标准 fetch / AbortSignal |
| Axios          | `api-axios.ts`         | 注入 Axios 1.x instance  |
| TanStack Query | `api-query-options.ts` | v5 option factories      |

生成文件顺序和 LF 换行稳定，顶部包含来源 basename 与“不要手改”，没有时间戳或绝对路径。fetch/Axios 支持 base URL、参数序列化、headers 注入、AbortSignal 和类型化错误；不生成业务认证逻辑。详见 [生成兼容矩阵](./docs/generator-compatibility.md)。

## Web 能力

- OpenAPI 3.0/3.1、JSON/YAML、最大 10 MiB；本地 `$ref`、参数、request/response schema。
- 确定性 TypeScript、Zod、MSW、fetch、Axios、Query 生成。
- 成功、空数据、常见错误、延迟、网络失败、响应序列等 Mock 场景。
- 固定 seed、overrides、边界/故意违约 Fixture 和 factory/buildList 导出。
- 稳定 breaking/warning/info OpenAPI Diff Markdown/JSON 报告。
- 本地真实响应校验、JSON Pointer 问题、场景保存和敏感字段脱敏。
- 浅/深主题、中文/英文、深链接、键盘焦点、reduced-motion 和响应式布局。

## CI 与发布验证

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run pack:smoke
npm run benchmark
```

项目 CI 在 Ubuntu 执行完整检查并交叉编译 Windows 启动器，在 Windows、Ubuntu、macOS 上执行 CLI 测试和 tarball 冒烟。可复制的契约检查示例见 [api-contract.github-actions.yml](./docs/examples/api-contract.github-actions.yml)。发布工作流构建 Web zip、Windows exe、配置文件、core/CLI tarball 和 SHA-256；不会执行 `npm publish`。

本地制作包但不发布：

```bash
npm run build
npm pack --workspace @api-bridge/core
npm pack --workspace @api-bridge/cli
# 经人工核对包名、registry、权限和 tarball 后才可执行：
npm publish ./api-bridge-core-0.1.0.tgz --access public
npm publish ./api-bridge-cli-0.1.0.tgz --access public
```

## 架构、版本与安全

- `src/core/index.ts`：Web 与 CLI 共用的无 DOM/React/文件系统 public API。
- `packages/core`：`@api-bridge/core` 发布包装。
- `packages/cli`：Node 20+ 文件、配置、manifest、原子提交和退出码适配层。
- `src`：React/Vite Web 和 IndexedDB/Worker 浏览器适配。

Core API、manifest、JSON Diff report schema 当前均为 `1.0.0`，未知 major 必须拒绝。`0.x` 的 breaking public API/生成字节变化会提升 minor 并写入 CHANGELOG；弃用项尽量保留至少一个 minor。架构详情见 [architecture.md](./docs/architecture.md)，Diff 规则见 [diff-rules.md](./docs/diff-rules.md)。

导入内容只经 JSON/YAML 解析并作为转义文本显示，不执行脚本或 Markdown。Web 无后端、认证代理、遥测和第三方脚本；CLI 不联网。安全问题请勿携带真实规范或响应公开提交，参见 [SECURITY.md](./SECURITY.md)。

## 支持矩阵与限制

| 范围   | 状态                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Web    | Chromium 自动化；Firefox/WebKit 尚未验证                               |
| CLI    | Windows 本地验证；Linux/macOS 由 CI 矩阵定义，当前仓库运行前不声称通过 |
| Node   | 20+；仓库开发要求 20.17+                                               |
| `$ref` | 仅本地 JSON Pointer；不获取外部/远程引用                               |
| Schema | 常用 object/array/required/nullable/enum/组合/递归；不是完整方言验证器 |

本项目不提供 Postman 式请求客户端、CORS/认证代理、账号/团队/云同步、AI 自动修复、VS Code 插件或远程规范抓取。真实响应必须粘贴或导入。项目数据随浏览器站点存储，清除站点数据后无法恢复。

## 开源协作与路线图

项目采用 [MIT License](./LICENSE)。贡献前阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)、[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) 和 [CHANGELOG.md](./CHANGELOG.md)。后续版本可在真实需求驱动下扩展更多 OpenAPI 方言映射、浏览器矩阵和构建拆包；不承诺未实现的云端或通用 HTTP 能力。
