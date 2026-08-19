# API Bridge 项目介绍

## 1. 项目定位

API Bridge 是一个本地优先的 OpenAPI 前端契约工作台，帮助前端开发者把 Swagger/OpenAPI 文档转换为可浏览、可验证、可生成代码的工程资产。

项目由 Web 工作台、共享核心库、命令行工具和 Windows 单文件启动器组成。Web 与 CLI 复用相同的解析、生成、Fixture、Diff 和响应校验逻辑，避免不同入口产生不一致结果。

所有导入的 OpenAPI、Fixture、真实响应、Mock 场景和生成配置均保存在用户设备中。项目不包含账号、云同步、遥测、AI 修复或通用 HTTP 请求代理。

## 2. 适用场景

- 从 Swagger/OpenAPI 文档浏览接口、参数、请求体、响应和 Schema。
- 为前端项目生成 TypeScript 类型、Zod Schema、MSW Handler 和请求代码。
- 创建成功、空数据、错误、延迟、网络失败和响应序列等 Mock 场景。
- 生成确定性 Fixture，并导出 factory 或数据列表。
- 比较两个 OpenAPI 版本，识别 breaking、warning 和 info 变化。
- 将真实 JSON 响应与指定 operation/status 的响应 Schema 对比。
- 在 CI 中检查规范、生成代码是否过期以及契约是否包含破坏性变更。

## 3. 产品组成

```text
API Bridge
├── Web 工作台（React + Vite）
├── @api-bridge/core（共享核心）
├── @api-bridge/cli（Node.js CLI）
└── API-Bridge.exe（内嵌 Web 的 Go 启动器）
```

### Web 工作台

浏览器界面提供项目导入、接口浏览、代码生成、Mock 场景、Fixture、Diff 和真实响应校验。支持中文/英文、浅色/深色主题以及响应式布局。

### 共享核心

`@api-bridge/core` 提供稳定 public API，包含：

- OpenAPI JSON/YAML 解析与规范化模型。
- TypeScript、Zod、MSW、fetch、Axios、TanStack Query 生成。
- Mock 场景和 Fixture。
- OpenAPI Diff。
- 真实响应校验与敏感字段脱敏。

核心包不依赖 React、DOM、IndexedDB 或 Node 文件系统。

### CLI

`api-bridge` 用于本地仓库和 CI，支持：

```bash
api-bridge check ./openapi.yaml
api-bridge generate ./openapi.yaml --output ./src/api
api-bridge diff ./baseline.yaml ./candidate.yaml --format markdown
api-bridge validate-response ./openapi.yaml --operation getUsers --status 200 --input response.json
```

CLI 支持 JSON 机器输出、配置文件、稳定退出码、原子写入、生成结果过期检查以及受管理文件保护。

### Windows 单文件启动器

`API-Bridge.exe` 内嵌同一份 Web production build。目标电脑不需要安装 Node.js、npm 或 Go，双击后会启动本地 HTTP 服务并按配置打开默认浏览器。

启动器只是静态文件托管层，不包含或复制 OpenAPI 业务逻辑。

## 4. 生成目标

| 目标           | 输出文件               | 兼容范围                 |
| -------------- | ---------------------- | ------------------------ |
| TypeScript     | `api-types.ts`         | TypeScript 5.x           |
| Zod            | `api-schemas.ts`       | Zod 3.24+                |
| MSW            | `api-handlers.ts`      | MSW 2.x                  |
| Fetch          | `api-fetch.ts`         | 标准 Fetch / AbortSignal |
| Axios          | `api-axios.ts`         | Axios 1.x instance       |
| TanStack Query | `api-query-options.ts` | TanStack Query v5        |

生成文件具有稳定顺序和 LF 换行，不包含当前时间或绝对路径。文件顶部注明来源和“请勿手改”。

## 5. 隐私与安全边界

- Web 不主动上传规范、响应或生成数据。
- CLI v0.1.0 只读取本地 JSON/YAML，不抓取远程 URL。
- 导入文本按数据解析并以转义文本展示。
- Web production build 不加载遥测、远程字体或不必要的第三方脚本。
- CSP 限制脚本、资源、连接和 Worker 来源。
- 响应校验错误不会输出捕获到的敏感响应正文。

如果需要验证真实线上接口，应先在 Swagger 页面或其他授权工具中取得响应，再将 JSON 粘贴或导入 API Bridge。API Bridge 本身不是 Postman，也不负责登录或发送业务请求。

## 6. 技术与运行要求

- 源码开发：Node.js 20.17+、npm。
- CLI：Node.js 20+。
- 构建 Windows 启动器：Go 1.22+。
- 运行 Windows exe：无需 Node.js、npm 或 Go。
- 浏览器自动化当前覆盖 Chromium；Firefox/WebKit 尚未验证。

## 7. 当前限制

- 不解析远程 URL，也不抓取 Swagger 页面地址。
- 不支持外部 `$ref` 文件或远程引用。
- 不提供通用 HTTP Client、认证管理或浏览器代理。
- 不包含多人协作、账号、云同步和托管服务。
- Windows exe 已在 Windows x64 验证；其他桌面平台没有提供对应可执行文件。

详细操作步骤参见 [操作手册](./user-manual.md)。
