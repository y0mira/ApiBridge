# Contract diff rules

API Bridge 将 OpenAPI 响应视为面向前端消费者的契约，规则固定且不使用 AI 推断。

| Change                                | Severity | Rule                                 |
| ------------------------------------- | -------- | ------------------------------------ |
| 删除 endpoint、请求参数或响应状态     | breaking | 已有调用或处理分支不再受支持         |
| 新增必填请求参数                      | breaking | 现有调用缺少必需输入                 |
| 新增可选请求参数或 endpoint           | info     | 现有调用仍有效                       |
| 响应字段删除或由 required 变 optional | breaking | 消费者可能读取不到原有字段           |
| 响应字段新增                          | info     | 消费者可忽略新字段                   |
| 响应字段由 optional 变 required       | warning  | 服务端承诺增强，但历史数据可能不满足 |
| 响应字段类型变化                      | breaking | 消费者的类型假设失效                 |
| 响应新增 nullable                     | breaking | 消费者可能未处理 null                |
| 响应移除 nullable                     | info     | 输出值域收窄                         |
| 响应 enum 扩大                        | breaking | 消费者可能遇到未处理的新值           |
| 响应 enum 收缩                        | info     | 不会产生未知新值，但可能反映行为变化 |
| 新增响应状态                          | warning  | 消费者需要检查新的处理分支           |
| `$ref` 目标变化                       | warning  | 需要检查新组件是否结构兼容           |

报告按 JSON Pointer、变化类型和严重度稳定排序，适合提交 Git。
