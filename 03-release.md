# 第三阶段提示词：CLI、双语、CI 与开源发布

你正在完成现有 `API Bridge` 的 `v0.1.0` 开源发布版本。先读取仓库、README、前两阶段代码、测试和 Git 状态并运行基线。目标不是继续堆产品功能，而是让生成器可进入真实前端仓库、让契约检查可进入 CI，并使 Web 工具可稳定公开部署。

## 1. 范围原则

- 在现有 parser、规范化模型、生成器和规则引擎上工作，不复制实现。
- 优先正确性、可复现、向后兼容、文档和发布体验。
- 不新增账号、云服务、协作、通用 HTTP Client、AI、浏览器代理或 VS Code 插件。
- 每项改动必须对应本阶段要求；不要重写 UI 或顺手清理无关代码。

## 2. Monorepo 与共享核心

在确有需要的前提下整理为轻量 workspace：

```text
apps/web
packages/core
packages/cli
```

- `core` 包含 OpenAPI 解析后的规范化模型、代码生成、Fixture、Diff 和响应校验；不得依赖 DOM、React、Node 专属文件系统。
- Web 与 CLI 复用同一 core，不允许两套规则漂移。
- 如果当前结构无需移动大量文件也能实现共享，采用更小改动；不要为了目录好看重构所有 import。
- 设置清晰的 public API，内部模块不被 Web/CLI 深层路径引用。

## 3. CLI

发布 npm CLI，命令名暂定 `api-bridge`，至少支持：

```bash
api-bridge generate ./openapi.yaml --output ./src/api
api-bridge diff ./baseline.yaml ./candidate.yaml --format markdown
api-bridge validate-response ./openapi.yaml --operation getUsers --status 200 --input response.json
api-bridge check ./openapi.yaml
```

要求：

- Node.js 20+，Windows/macOS/Linux 可运行。
- 支持 JSON/YAML 本地文件；第一版不抓取远程 URL。
- `generate` 支持选择 TypeScript、Zod、MSW、fetch、Axios、TanStack Query 目标。
- 提供配置文件，例如 `api-bridge.config.ts`，但所有关键选项也有 CLI 参数；优先级明确。
- 支持 `--dry-run`、`--check` 和有意义的退出码。
- `--check` 在生成结果与磁盘不一致时退出非零，用于 CI 检查未提交的生成代码。
- 写文件前在内存完成全部生成；失败不得留下半写目录。更新时只替换本工具管理的文件，禁止删除用户文件。
- 每个生成目录包含 manifest，记录工具版本、输入规范摘要、配置摘要和管理文件清单，但不得记录密钥或绝对私人路径。
- 输出顺序、换行和格式稳定；同一输入跨平台尽量产生相同字节。
- 终端输出简洁，支持 `--json` 机器可读模式和 `NO_COLOR`。
- 错误包含文件、规范位置和修复方向；不得输出捕获到的敏感响应正文。

## 4. Git 与 CI 工作流

提供可复制的 GitHub Actions 示例：

- 校验 OpenAPI。
- 检查生成代码是否最新。
- baseline/candidate Diff 出现 breaking change 时失败。
- 上传 Markdown/JSON 报告 artifact。

项目自身 CI 至少运行：

- 锁文件安装。
- lint、format check、typecheck。
- core、CLI、Web unit tests。
- 生成代码编译测试。
- Playwright。
- Web production build。
- `npm pack` 后在临时示例项目中安装并执行 CLI 冒烟测试。
- Windows、Ubuntu、macOS 的 CLI 关键测试矩阵。

CI 使用最小权限、依赖缓存和 concurrency cancellation，不能缓存生成结果造成假通过。

## 5. 中英文国际化

Web 管理界面和核心文档支持 `zh-CN`、`en-US`：

- 使用成熟轻量方案，如 `i18next` + `react-i18next`；已有等价方案则沿用。
- 顶栏提供“中文 / English”，不使用国旗代表语言。
- 首次根据浏览器语言选择，之后保存到 localStorage。
- 切换语言不刷新页面，不丢失项目、版本、operation、场景和未保存编辑内容。
- 更新 `<html lang>`。
- 导航、表单、空/加载/错误状态、Toast、Diff 理由、校验问题、下载提示和 accessible name 全部双语。
- HTTP method、path、Header、JSON、代码、配置 key 和 CLI 命令不翻译。
- 日期数字用 `Intl`；存储与报告机器格式保持稳定。
- 中英文翻译 key 集合自动检查一致。
- README 中文主文档和英文版相互链接，功能、安全边界和命令保持一致。
- CLI 默认英文以保证脚本稳定；允许 `--json` 作为可靠机器接口，不为 v0.1.0 增加复杂 CLI 多语言。

## 6. Web 发布与安全

- 生产 Web 是纯静态站点，可部署到 GitHub Pages，并提供其他静态托管说明。
- 正确处理非根路径 base URL 和 SPA 路由刷新。
- 提供 GitHub Pages 部署工作流，但不伪造真实域名。
- 添加 CSP 等适合静态应用的安全头部署示例。
- 不加载不必要的第三方脚本、遥测或远程字体；字体可本地打包。
- 导入内容只作为数据解析和转义文本展示，防止 YAML/JSON/Markdown/文件名注入。
- 下载文件名安全化。
- 依赖审计并处理可实际利用的高风险问题，不盲目升级导致破坏。
- 明确声明所有 OpenAPI、Fixture、响应和生成设置均留在用户设备。

## 7. API 与生成兼容性

- 为 core public API、配置文件、manifest、JSON Diff 报告定义显式 schema/version。
- 未知 major version 必须拒绝，不能猜测兼容。
- 创建契约测试和 fixtures，防止生成格式无意漂移。
- 定义 v0.x 兼容策略和弃用策略。
- 生成文件顶部以克制注释标明来源与“请勿手改”；不要写绝对路径、当前时间等导致无意义 diff 的内容。
- 若必须升级 MSW、Zod、TanStack Query 等目标版本，应在文档明确兼容范围。

## 8. 性能与可访问性收尾

- 对大型规范建立可重复基准：解析、Diff、生成耗时和内存观察；只记录实际测得环境，不宣称通用性能。
- Web Worker 任务可取消，切换项目时忽略过期结果。
- Monaco、YAML parser 等重依赖按需加载并检查 bundle 组成。
- 达到 WCAG AA：对比度、键盘、焦点、对话框、live region、缩放和 44x44 点击目标。
- 支持 `prefers-reduced-motion`。
- 两种语言分别在 375、768、1024、1440 检查，避免英文长词和中文密集文本导致溢出。

## 9. 开源资料

完善：

- `README.md` 与英文版：定位、真实截图位置、在线体验位置、安装、Web/CLI 快速开始、生成示例、CI 示例、隐私、支持矩阵、限制、路线图。
- `LICENSE`：默认 MIT，已有许可证则不擅自替换。
- `CONTRIBUTING.md`。
- `CODE_OF_CONDUCT.md`。
- `SECURITY.md`。
- Issue 模板：Bug、OpenAPI compatibility、Feature。
- PR 模板：动机、测试、生成结果变化、截图、兼容性。
- `CHANGELOG.md`。
- `docs/architecture.md` 和 `docs/generator-compatibility.md`，只描述真实实现。

不得使用虚假徽章、星数、下载量、性能数字、域名或尚未实现的能力。

## 10. 发布产物

- Web production artifact。
- npm `core` 包（仅当对外复用确有稳定 public API）。
- npm CLI 包。
- GitHub Release 中附带 source、Web artifact、校验值和 release notes。
- 包内容不得包含测试 fixture 中的敏感样例、缓存、源码映射中的私人路径或无关大文件。
- `npm pack --dry-run` 和实际临时安装验证必须通过。
- 不执行真实 npm publish，除非用户已明确授权并提供发布环境；先生成可发布 tarball 和准确发布命令。

## 11. 最终验证清单

1. 全新 clone 按 README 能启动 Web 并运行全部检查。
2. 第一、第二阶段所有测试继续通过。
3. Web production build 可作为纯静态文件运行，非根路径刷新正常。
4. CLI 在 Windows、Linux、macOS 矩阵通过关键测试。
5. tarball 安装后 `check`、`generate`、`diff`、`validate-response` 冒烟通过。
6. `generate --check` 能识别过期生成代码且不修改文件。
7. 写入失败不留下半生成目录，不删除用户文件。
8. Web 与 CLI 对同一 fixture 产生一致核心结果。
9. breaking change 能让 CI 示例正确非零退出。
10. 中文与英文完整切换、持久化、无缺失 key，切换不丢状态。
11. 两种语言目标宽度无阻塞溢出，键盘、焦点、对比度、reduced-motion 通过。
12. 导入恶意文本只显示为数据，不执行脚本。
13. Git 状态中无构建物、缓存、用户规范、Fixture 下载、密钥和本机配置。
14. README、支持矩阵、生成代码和实际行为一致。

无法在当前环境验证的平台或发布步骤必须明确标为“未验证”，给出准确复现命令，禁止用推测代替结果。

## 12. 完成输出

输出 `v0.1.0` 发布候选报告：

- Web、core、CLI 结构与 public API。
- 实际完成能力与明确未做事项。
- 生成目标兼容矩阵。
- 中英文覆盖与无障碍结果。
- 实际执行的命令、测试、平台和结果。
- bundle/性能观察。
- npm tarball 与静态站点产物状态。
- 未验证项、已知限制和风险。
- v0.1.0 Release Notes 草稿。

只有代码、测试、产物和文档相互一致时，才称为 release candidate。不要声称未运行的检查通过。
