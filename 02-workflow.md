# 第二阶段提示词：Mock 场景、Fixture 与契约检查

你正在继续开发现有 `API Bridge` 仓库。第一阶段应已完成 OpenAPI 导入、endpoint/schema 浏览，以及 TypeScript、Zod、MSW 2.x 生成。先阅读 README、代码、测试和 Git 状态并运行基线检查；在现有实现上增量开发，不得推倒重写或更换技术栈。

本阶段目标是让前端开发者在后端未完成、响应不稳定或接口发生变化时仍能独立开发页面。

## 1. 开始前要求

- 先运行现有 lint、typecheck、unit、build、Playwright，记录基线。
- 说明本阶段修改范围和每组改动的验证方法。
- 复用第一阶段的 parser、规范化模型、生成器和组件。
- 不做无关重构，不提前实现 CLI、账号、云同步和团队功能。

## 2. 场景编辑器

每个 operation 可以创建多个命名场景：

- 默认成功。
- 空数据。
- 401、403、404、409、422、429、500 等错误响应。
- 自定义状态码、Headers、JSON/text body。
- 延迟响应，范围 0-30 秒。
- 网络错误、连接拒绝和超时。
- 响应序列，例如轮询时 `pending -> pending -> completed`。

要求：

- 创建场景时优先从 OpenAPI response/example 初始化。
- JSON Body 使用 Monaco 编辑并实时语法校验。
- 可选地按对应 response schema 校验场景 body，错误可定位到字段。
- 场景有稳定 ID；重命名不破坏引用。
- 每个接口只能有一个默认场景。
- 用户可以复制、排序、删除场景。
- 操作支持撤销或至少在未保存离开时明确警告。

生成的 MSW 代码支持通过环境变量、query/header 或统一 runtime 配置选择场景，但保持 API 简单并附带可运行示例。不要生成依赖 API Bridge 页面常驻运行的代码；导出文件进入业务仓库后应能独立工作。

## 3. Fixture 与边界数据

提供确定性 Fixture 生成器：

- 从 schema/example 生成单个对象和列表。
- 支持用户覆盖字段值。
- 支持数量、固定 seed 和稳定 ID。
- 提供边界变体：空字符串、null、零、负数、极长文本、Unicode、空数组、大列表、最小/最大日期、未知 enum。
- 只对 schema 允许或用户明确选择的变体生成数据；不要随意制造违反契约的数据。
- “故意违反契约”的变体必须独立标记，用于测试前端容错。

导出：

- JSON fixture。
- TypeScript 常量。
- 简单 factory 函数，支持 overrides 和 buildList。
- 对应的 MSW handler 引用。

不要引入 LLM、Faker 云服务或不可复现随机数据。

## 4. OpenAPI 版本 Diff

用户可以为同一项目导入 baseline 和 candidate 两个版本，输出：

- 新增、删除、修改 endpoint。
- method/path/parameter/request body/response 状态码变化。
- schema 字段新增、删除、required 变化、类型变化、nullable 变化、enum 扩大或收缩。
- `$ref` 指向变化和 component schema 变化。
- 破坏性 `breaking`、需关注 `warning`、兼容 `info` 三种严重度。
- 每项显示规范位置、变化前后和理由。

规则必须确定、可测试。为“破坏性”的判定写清楚规则表，不使用 AI 猜测。例如：删除 response 字段是否对消费者破坏，应按项目明确采用的响应兼容规则处理并在 UI 解释。

支持导出 Markdown 和 JSON 报告。报告顺序稳定，适合提交 Git。

## 5. 真实响应校验

允许用户粘贴或导入一次真实响应，不在浏览器里直接请求任意后端，避免 CORS、认证和代理范围扩张。

输入：

- 选择 operation 和状态码。
- 粘贴 JSON/text body。
- 可选粘贴 response headers。

输出：

- 是否匹配对应 OpenAPI response schema。
- 缺失必填字段、额外字段、类型不符、nullable 不符、enum 不符。
- JSON Pointer、期望值、实际值和简短修复建议。
- 一键把有效响应保存为场景或 fixture。
- 一键对敏感字段进行预览脱敏后导出。

原始响应只保存在本地，不写入日志。

## 6. 代码生成扩展

新增但控制范围：

- Axios client 函数。
- 原生 fetch client 函数。
- TanStack Query v5 query/mutation options 或 hooks，二选一并在 README 说明设计。
- 参数序列化、base URL 注入、AbortSignal 和类型化错误的最小实现。
- 生成代码不得包含业务认证逻辑，只保留明确的注入点。

所有目标使用同一个规范化模型，禁止每个生成器重复解析 OpenAPI。生成结果必须经过格式化并可被 TypeScript 编译。

## 7. 产品设计与交互

### 视觉基线

- 高密度开发者工作台，支持完整浅色与深色主题。
- 正文使用 IBM Plex Sans，代码、path、schema、diff 使用 JetBrains Mono。
- 主色为深 slate；强调色使用契约绿色，但错误、warning、info 不能只依赖颜色。
- 使用语义 token，组件中不散落原始 hex。
- 避免大面积渐变、玻璃拟态、悬浮大圆角卡片、无意义统计图和装饰性动画。

### 视觉签名：契约桥

在 Diff、真实响应校验和代码预览中，选中一个 schema 字段后，用克制的映射轨道同时高亮：

```text
OpenAPI field -> actual response field -> generated TypeScript/Zod line
```

映射轨道表达来源关系，不做持续动画。映射不存在时明确显示断点和原因。

### 信息架构

```text
+--------------+----------------------+----------------------------------+
| Project      | Contract             | Workbench                        |
| versions     | endpoints/schemas    | scenarios / fixtures / diff/code |
+--------------+----------------------+----------------------------------+
```

- 深链接保存 project、version、operation 和当前工具页。
- 浏览器前进后退行为正确。
- 1024px 以下分层展示；375px 下至少可导入、选择 operation、切换场景和查看报告。
- 代码区允许自身横向滚动，页面整体不能横向溢出。

### 反馈与无障碍

- hover/focus 100-150ms，面板切换 200-300ms，只使用 transform/opacity。
- 支持 `prefers-reduced-motion`；减少动态时映射轨道直接显示最终状态。
- 导入、解析、生成、保存、下载和校验都有明确进行中、成功、失败状态。
- 错误指出原因和下一步，不只显示 “Something went wrong”。
- 关键点击目标至少 44x44px；焦点可见；对话框管理焦点并支持 Escape。
- Diff 的新增/删除/修改同时使用图标、文字与颜色。

## 8. 性能与可靠性

- 大规范解析和 Diff 放入 Web Worker，UI 不应长时间卡死。
- endpoint/schema 长列表使用虚拟化或分段渲染。
- Monaco 仅在需要时懒加载。
- IndexedDB 迁移可恢复；导入新版本失败不覆盖 baseline。
- 10 MiB 规范和具有数千 endpoint 的 fixture 应有可解释的性能测试，不虚构指标。

## 9. 测试与验收

在保留第一阶段测试基础上至少增加：

- 场景创建、复制、排序、默认唯一、延迟、网络错误和响应序列。
- schema 校验错误路径准确。
- Fixture seed 稳定、overrides、buildList 和边界变体。
- Diff 覆盖 endpoint、参数、required、nullable、type、enum 和 response 变化。
- Markdown/JSON 报告稳定快照。
- 真实响应校验与保存场景。
- Axios、fetch、TanStack Query、TypeScript、Zod、MSW 生成结果编译测试。
- 深链接、前进后退、主题、键盘、reduced-motion。
- Playwright 主流程：导入 baseline/candidate -> 查看 breaking change -> 创建错误场景 -> 导出 MSW。
- 375、768、1024、1440 两种主题的实际浏览器检查。

## 10. 明确不做

- 不做 Postman 式通用请求客户端。
- 不做远程 URL 抓取、CORS 代理和认证管理。
- 不做 CLI、npm 发布和 VS Code 插件；留到第三阶段。
- 不做账号、团队、RBAC、云存储和在线协作。
- 不做 AI 自动修复和脚本执行。

## 11. 完成标准

- 第一阶段所有检查继续通过。
- 前端开发者可为接口建立成功、空数据、错误、延迟与序列场景，并导出独立工作的 MSW。
- Fixture 可复现并能覆盖常见页面边界状态。
- 两版 OpenAPI 可得到稳定、可解释的契约报告。
- 真实响应可本地校验并转为场景。
- 新增生成目标可编译，页面在目标尺寸和键盘操作下可用。
- 没有无关重构、伪实现、未使用依赖和隐藏失败。

完成后输出：变更摘要、契约规则表、实际测试结果、浏览器检查结果、性能观察、已知限制和第三阶段建议。
