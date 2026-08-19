# API Bridge 操作手册

## 1. 选择启动方式

### 方式一：双击 Windows exe

适合普通 Windows 用户，不要求安装 Node.js。

1. 将 `API-Bridge.exe` 和 `web.config.json` 放在同一目录。
2. 双击 `API-Bridge.exe`。
3. 程序启动本地服务并自动打开默认浏览器。
4. 关闭启动器的控制台窗口即可停止服务。

配置示例：

```json
{
  "host": "127.0.0.1",
  "port": 59116,
  "previewPort": 4173,
  "openBrowser": true
}
```

- `host`：监听地址。仅本机使用时保持 `127.0.0.1`。
- `port`：exe 和开发服务器使用的端口。
- `previewPort`：`npm run preview:web` 使用的端口。
- `openBrowser`：启动 exe 后是否自动打开默认浏览器。

修改配置后需要关闭并重新启动 exe。端口已被占用时，启动器会显示错误，不会擅自切换端口。

exe 旁没有配置文件时，默认使用 `127.0.0.1:59116` 并自动打开浏览器。

### 方式二：从源码启动 Web

要求 Node.js 20.17 或更高版本。Node.js 18 不受支持。

```powershell
npm ci
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

端口在仓库根目录的 `web.config.json` 中修改。修改后重新执行 `npm run dev`。

### 方式三：预览 production build

```powershell
npm run build:web
npm run preview:web
```

默认访问 `http://127.0.0.1:4173`，端口由 `previewPort` 控制。

## 2. 从 Swagger 获取 OpenAPI 文档

例如已有 Swagger UI：

```text
https://localhost:59116/swagger/index.html#/ExposeApi
```

API Bridge 不直接导入这个 HTML 页面地址，需要取得 Swagger 背后的 OpenAPI JSON。常见地址包括：

```text
https://localhost:59116/swagger/v1/swagger.json
https://localhost:59116/swagger.json
https://localhost:59116/openapi.json
```

具体地址由后端项目配置决定。可在浏览器开发者工具 Network 中刷新 Swagger 页面，查找名称包含 `swagger.json` 或 `openapi.json` 的请求。

打开 JSON 地址后：

1. 将内容另存为 `openapi.json`；或复制全部 JSON。
2. 打开 API Bridge。
3. 选择文件、拖入文件或粘贴 JSON/YAML。
4. 单击“导入”。

如果本地 HTTPS 使用开发证书，浏览器可能先要求确认该证书。API Bridge 不会绕过浏览器或操作系统的证书检查。

## 3. 浏览接口

导入后：

1. 左侧显示本地项目历史。
2. 中间区域显示 operation 列表。
3. 使用搜索框按 path、method 或 operationId 搜索。
4. 选择 operation 后查看参数、请求体、响应和 Schema。
5. 可选择一个或多个 operation 进入代码生成。

项目保存在当前浏览器的 IndexedDB。清除浏览器站点数据会删除这些本地项目和场景。

## 4. 生成前端代码

1. 勾选需要生成的 operation。
2. 单击生成按钮。
3. 在结果标签页查看各个文件。
4. 可复制当前文件或分别下载。

支持的目标：

- TypeScript 类型
- Zod Schema
- MSW Handler
- Fetch Client
- Axios Client
- TanStack Query options

生成文件会引用对应运行时依赖。例如选择 Axios 后，目标项目需要安装兼容的 Axios 1.x。

## 5. Mock 场景

进入“场景”工具后，可以：

1. 选择 operation 和 HTTP 状态码。
2. 设置场景名称、延迟和响应 Header。
3. 编辑响应 Body。
4. 配置网络失败或响应序列。
5. 保存场景。
6. 导出独立 MSW Handler。

场景数据保存在浏览器本地。切换中文/英文不会清除未保存内容。

## 6. Fixture

Fixture 工具根据响应 Schema 生成确定性样本：

1. 选择 operation、状态码和 Schema。
2. 设置固定 seed。
3. 选择普通、边界或故意违约模式。
4. 根据需要设置字段 override。
5. 生成并复制 JSON、factory 或 buildList 结果。

相同规范、seed 和配置应产生稳定结果，便于测试和代码审查。

## 7. OpenAPI Diff

1. 当前项目作为 baseline。
2. 打开“差异”工具。
3. 粘贴或导入 candidate OpenAPI。
4. 执行比较。
5. 查看 breaking、warning 和 info 项。
6. 下载 Markdown 或 JSON 报告。

常见 breaking change 包括删除 operation、增加必填参数、缩窄类型或删除成功响应。

## 8. 校验真实响应

API Bridge 不会主动请求后端。先通过 Swagger UI 执行接口，然后复制响应 JSON：

1. 在 Swagger UI 展开接口并单击 `Try it out`。
2. 填写必要参数并单击 `Execute`。
3. 复制 Response body。
4. 回到 API Bridge 的“校验”工具。
5. 选择对应 operation 和状态码。
6. 粘贴响应 JSON并执行校验。
7. 根据 JSON Pointer、期望类型和问题说明定位字段。

不要把密码、Token 或客户敏感数据保存到仓库。响应校验虽在本地执行，仍建议使用脱敏样本。

## 9. 使用 CLI

发布后在目标仓库安装：

```bash
npm install --save-dev @api-bridge/cli
```

检查规范：

```bash
npx api-bridge check ./openapi.yaml
```

生成代码：

```bash
npx api-bridge generate ./openapi.yaml --output ./src/api --targets typescript,zod,fetch,query
```

检查已提交的生成代码是否过期：

```bash
npx api-bridge generate ./openapi.yaml --output ./src/api --check
```

比较规范：

```bash
npx api-bridge diff ./baseline.yaml ./candidate.yaml --format markdown
```

校验响应文件：

```bash
npx api-bridge validate-response ./openapi.yaml --operation getUsers --status 200 --input response.json
```

退出码：

| 退出码 | 含义                                       |
| ------ | ------------------------------------------ |
| `0`    | 成功                                       |
| `1`    | 参数、文件、I/O 或解析错误                 |
| `2`    | 契约校验失败、breaking Diff 或生成代码过期 |

## 10. CLI 配置文件

在项目中创建 `api-bridge.config.ts`：

```ts
export default {
  schemaVersion: '1.0.0',
  input: './openapi.yaml',
  output: './src/api',
  targets: ['typescript', 'zod', 'fetch', 'query'],
}
```

CLI 参数优先于配置文件，配置文件优先于默认值。

`api-bridge.config.ts` 是代码生成配置；`web.config.json` 是 Web/exe 启动配置，两者用途不同。

## 11. 构建 Windows exe

开发电脑需要 Node.js 20.17+ 和 Go 1.22+：

```powershell
npm ci
npm run build:launcher
```

生成：

```text
release/API-Bridge.exe
release/web.config.json
```

构建过程先生成 Vite production build，再将 `dist/` 嵌入 Go 可执行文件。`release/` 属于本地构建产物，不提交 Git。

## 12. 常见问题

### 双击 exe 后网页打不开

检查控制台错误，并确认：

- `web.config.json` 是合法 JSON。
- `port` 在 1 到 65535 之间。
- 端口未被其他程序占用。
- 防火墙或安全软件没有拦截该 exe。

### 端口被占用

修改 `web.config.json` 中的 `port`，例如改为 `59117`，然后重新启动。

### 局域网其他电脑需要访问

将 `host` 改为 `0.0.0.0`，在 Windows 防火墙中仅对可信网络开放端口，然后使用启动电脑的局域网 IP 访问。不要直接暴露到公网。

### 导入 Swagger 页面地址失败

Swagger UI 地址是 HTML，不是 OpenAPI 文档。请找到实际的 `swagger.json` 或 `openapi.json`，保存后再导入。

### Node.js 18 无法启动

源码和 CLI 要求 Node.js 20+，仓库开发要求 20.17+。升级 Node.js 后重新运行 `npm ci`。

### 关闭浏览器后服务仍然运行

浏览器只是客户端。关闭启动器控制台窗口或终止 `API-Bridge.exe` 才会停止本地服务。

### 数据保存在哪里

Web 项目和场景保存在浏览器 IndexedDB；语言设置保存在 localStorage。CLI 只读取输入文件并写入指定输出目录。
