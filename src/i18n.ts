import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export type Locale = 'zh-CN' | 'en-US'
export const STORAGE_KEY = 'api-bridge-language'

export const messages = {
  规范只保存在此浏览器: 'Contracts stay in this browser',
  项目: 'Projects',
  接口: 'Endpoints',
  检查器: 'Inspector',
  工作区导航: 'Workspace navigation',
  语言: 'Language',
  代码已复制: 'Code copied',
  清空本地数据: 'Clear local data',
  '粘贴 OpenAPI JSON / YAML': 'Paste OpenAPI JSON / YAML',
  '加载编辑器…': 'Loading editor…',
  选择文件: 'Choose file',
  '解析中…': 'Parsing…',
  导入: 'Import',
  '使用内置 Petstore 示例': 'Use built-in Petstore example',
  '也可拖拽文件到页面 · 最大 10 MiB': 'Or drop a file here · 10 MiB maximum',
  无法导入: 'Import failed',
  关闭错误: 'Dismiss error',
  本地历史: 'Local history',
  '导入第一份规范后，它会出现在这里。': 'Your first imported contract will appear here.',
  '导入一份 API 契约': 'Import an API contract',
  '选择文件、粘贴文本或载入明确标注的示例。':
    'Choose a file, paste text, or load the clearly labelled example.',
  '搜索 endpoint': 'Search endpoints',
  '搜索 path、operationId、summary': 'Search path, operationId, or summary',
  规范校验通过: 'Contract validation passed',
  '没有匹配的 endpoint。': 'No matching endpoints.',
  查看: 'View',
  代码: 'code',
  先修复阻塞错误: 'Resolve blocking errors first',
  契约详情: 'Contract details',
  打开工具: 'Open tools',
  返回工具: 'Back to tools',
  复制代码: 'Copy code',
  下载当前文件: 'Download current file',
  '选择一个 endpoint': 'Select an endpoint',
  '这里会显示参数、响应和 schema。生成后可编辑、复制和分别下载。':
    'Parameters, responses, and schemas appear here. Generated files can be edited, copied, and downloaded separately.',
  保存: 'Save',
  已保存: 'Saved',
  上移: 'Move up',
  下移: 'Move down',
  复制场景: 'Duplicate scenario',
  名称: 'Name',
  状态码: 'Status code',
  '延迟（毫秒）': 'Delay (milliseconds)',
  失败模式: 'Failure mode',
  正常响应: 'Normal response',
  网络错误: 'Network error',
  连接拒绝: 'Connection refused',
  超时: 'Timeout',
  'Body 类型': 'Body type',
  'Headers（每行 Name: Value）': 'Headers (one Name: Value per line)',
  设为唯一默认场景: 'Set as the only default scenario',
  关闭: 'Off',
  清除序列: 'Clear sequence',
  '添加 pending → completed': 'Add pending → completed',
  '场景响应 Body': 'Scenario response body',
  删除: 'Delete',
  生成MSW: 'Generate MSW',
  '生成 MSW': 'Generate MSW',
  '固定 seed、稳定 ID；默认只生成契约允许的数据。':
    'Fixed seed and stable IDs; contract-valid data by default.',
  数量: 'Count',
  '生成 Fixture': 'Generate fixture',
  边界变体: 'Boundary variant',
  契约默认值: 'Contract default',
  空字符串: 'Empty string',
  零: 'Zero',
  负数: 'Negative',
  极长文本: 'Very long text',
  空数组: 'Empty array',
  大列表: 'Large list',
  最小日期: 'Minimum date',
  最大日期: 'Maximum date',
  '未知 enum': 'Unknown enum',
  '故意违反契约（导出时独立标记）': 'Intentionally violate contract (marked separately)',
  导出: 'Export',
  '当前项目是 baseline；粘贴 candidate 后在 Worker 中比较。':
    'The current project is the baseline; paste a candidate to compare in a Worker.',
  '导入 candidate 文件': 'Import candidate file',
  '比较中…': 'Comparing…',
  比较版本: 'Compare versions',
  '导出 Markdown': 'Export Markdown',
  '导出 JSON': 'Export JSON',
  '仅校验粘贴或导入的数据，不请求远程服务器。':
    'Validates pasted or imported data only; no remote requests.',
  响应状态码: 'Response status',
  'Response headers（每行 Name: Value）': 'Response headers (one Name: Value per line)',
  导入一次真实响应: 'Import one real response',
  '真实响应 JSON': 'Real response JSON',
  校验响应: 'Validate response',
  '响应符合 schema': 'Response matches schema',
  期望: 'Expected',
  实际: 'actual',
  保存为场景: 'Save as scenario',
  脱敏导出: 'Export redacted',
  场景: 'Scenarios',
  样本: 'Fixtures',
  差异: 'Diff',
  校验: 'Validate',
  'Mock 场景': 'Mock scenarios',
  确定性样本: 'Deterministic fixtures',
  真实响应校验: 'Real response validation',
  'OpenAPI 字段': 'OpenAPI field',
  生成类型: 'generated type',
  '通过 query': 'Via query',
  '配置选择。': 'configuration.',
  '修复 JSON 语法后重试。': 'Fix the JSON syntax and try again.',
  'Diff Worker 执行失败。': 'The Diff Worker failed. Try the comparison again.',
  '文件超过 10 MiB 导入限制。': 'The file exceeds the 10 MiB import limit.',
  '文档根节点必须是对象。': 'The document root must be an object.',
  '仅支持 OpenAPI 3.0 和 3.1 文档。': 'Only OpenAPI 3.0 and 3.1 documents are supported.',
  '缺少必需的 info 对象。': 'The required info object is missing.',
  '缺少必需的 paths 对象。': 'The required paths object is missing.',
  '文档中没有 endpoint。': 'The document contains no endpoints.',
  '字段不允许为 null。': 'The field cannot be null.',
  '提供符合 schema 的值，或将字段声明为 nullable。':
    'Provide a schema-compatible value or declare the field nullable.',
  '值不在允许的 enum 中。': 'The value is not in the allowed enum.',
  '使用 schema 声明的 enum 值。': 'Use an enum value declared by the schema.',
  '删除额外字段或允许 additionalProperties。':
    'Remove the extra field or allow additionalProperties.',
  '响应字段类型变化会使现有消费者的类型假设失效。':
    'A response type change invalidates consumer assumptions.',
  '响应现在可能为 null，现有消费者可能未处理。':
    'The response may now be null and existing consumers may not handle it.',
  '响应不再为 null，按响应兼容规则属于收窄输出。':
    'The response is no longer null, which narrows output under the response policy.',
  '引用目标变化，需要检查组件结构是否仍兼容。':
    'The referenced component changed; review structural compatibility.',
  '响应 enum 收缩不会产生未知新值，但可能反映行为变化。':
    'The response enum narrowed; no unknown value is added, but behavior may change.',
  '响应可能返回消费者尚未处理的新 enum 值。':
    'The response may contain a new enum value not handled by consumers.',
  '项目采用响应消费者兼容规则：删除响应字段是破坏性变化。':
    'Under the response-consumer policy, removing a response field is breaking.',
  '新增响应字段通常向后兼容。': 'Adding a response field is normally backward compatible.',
  '响应字段变为必填，服务端承诺增强但需要检查历史数据。':
    'The response field became required; review historical data.',
  '原必填响应字段可能缺失，现有消费者可能失败。':
    'A previously required response field may now be absent.',
  '删除 endpoint 会破坏现有调用。': 'Removing an endpoint breaks existing calls.',
  '新增 endpoint 向后兼容。': 'Adding an endpoint is backward compatible.',
  '移除已有请求参数会破坏依赖该参数的调用。':
    'Removing an existing request parameter breaks dependent callers.',
  '新增必填请求参数会破坏现有调用。': 'Adding a required request parameter breaks existing calls.',
  '新增可选请求参数向后兼容。': 'Adding an optional request parameter is compatible.',
  '请求参数变为必填会破坏现有调用。': 'Making a request parameter required breaks existing calls.',
  '移除已有 request body 会改变调用契约。': 'Removing the request body changes the call contract.',
  '新增必填 request body 会破坏现有调用。': 'Adding a required request body breaks existing calls.',
  '新增可选 request body 向后兼容。': 'Adding an optional request body is compatible.',
  'Request body 变为必填会破坏现有调用。':
    'Making the request body required breaks existing calls.',
  '请求 content type 变化会破坏现有序列化方式。':
    'Changing the request content type breaks serialization.',
  '删除已声明响应状态会破坏依赖该分支的消费者。':
    'Removing a declared response breaks consumers of that branch.',
  '新增响应状态要求消费者检查未处理分支。': 'A new response status requires consumer review.',
  '删除 component schema 会破坏其引用者。': 'Removing a component schema breaks its references.',
  '新增 component schema 向后兼容。': 'Adding a component schema is backward compatible.',
} as const

const zh = Object.fromEntries(Object.keys(messages).map((key) => [key, key]))
const en = messages

void i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zh }, 'en-US': { translation: en } },
  lng:
    (localStorage.getItem(STORAGE_KEY) as Locale | null) ??
    (navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'),
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
  showSupportNotice: false,
})

const reverse = new Map<string, string>(
  Object.entries(messages).map(([key, value]) => [value, key]),
)

export function translateKnownText(value: string, locale: Locale) {
  const whitespace = value.match(/^\s*/)?.[0] ?? ''
  const suffix = value.match(/\s*$/)?.[0] ?? ''
  const text = value.trim()
  if (!text) return value
  let translated =
    locale === 'en-US'
      ? (messages[text as keyof typeof messages] ?? text)
      : (reverse.get(text) ?? text)
  if (locale === 'en-US') {
    translated = translated
      .replace(/^显示更多（(\d+)）$/, 'Show more ($1)')
      .replace(/^(\d+) 个契约问题$/, '$1 contract issue(s)')
      .replace(/^生成 (\d+) 个接口$/, 'Generate $1 endpoint(s)')
      .replace(/^响应序列：(\d+) steps$/, 'Response sequence: $1 steps')
      .replace(/^删除 (.+)$/, 'Delete $1')
      .replace(/^编辑 (.+)$/, 'Edit $1')
      .replace(/^复制 (.+) 路径$/, 'Copy $1 path')
      .replace(/^切换到浅色主题$/, 'Switch to light theme')
      .replace(/^切换到深色主题$/, 'Switch to dark theme')
      .replace(/^折叠 (.+)$/, 'Collapse $1')
      .replace(/^展开 (.+)$/, 'Expand $1')
      .replace(/^映射断点：(.+)$/, 'Mapping break: $1')
      .replace(/^缺少必填字段 (.+)。$/, 'Missing required field $1.')
      .replace(/^添加字段 (.+)。$/, 'Add field $1.')
      .replace(/^类型不匹配：期望 (.+)，实际 (.+)。$/, 'Type mismatch: expected $1, actual $2.')
      .replace(/^将值转换为 (.+)。$/, 'Convert the value to $1.')
      .replace(/^字段 (.+) 未在 schema 中声明。$/, 'Field $1 is not declared in the schema.')
      .replace(/^外部 \$ref 暂不解析：(.+)$/, 'External $ref is not resolved: $1')
      .replace(/^无法解析 \$ref：(.+)$/, 'Cannot resolve $ref: $1')
      .replace(/^operationId 冲突：(.+)$/, 'Duplicate operationId: $1')
  } else {
    translated = translated
      .replace(/^Show more \((\d+)\)$/, '显示更多（$1）')
      .replace(/^(\d+) contract issue\(s\)$/, '$1 个契约问题')
      .replace(/^Generate (\d+) endpoint\(s\)$/, '生成 $1 个接口')
      .replace(/^Response sequence: (\d+) steps$/, '响应序列：$1 steps')
      .replace(/^Delete (.+)$/, '删除 $1')
      .replace(/^Edit (.+)$/, '编辑 $1')
      .replace(/^Copy (.+) path$/, '复制 $1 路径')
      .replace(/^Switch to light theme$/, '切换到浅色主题')
      .replace(/^Switch to dark theme$/, '切换到深色主题')
      .replace(/^Collapse (.+)$/, '折叠 $1')
      .replace(/^Expand (.+)$/, '展开 $1')
      .replace(/^Mapping break: (.+)$/, '映射断点：$1')
  }
  return `${whitespace}${translated}${suffix}`
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const next = walker.nextNode()
    if (node.parentElement?.closest('textarea, .monaco-editor, code, pre, [data-i18n-ignore]')) {
      node = next
      continue
    }
    const translated = translateKnownText(node.nodeValue ?? '', locale)
    if (translated !== node.nodeValue) node.nodeValue = translated
    node = next
  }
  root.querySelectorAll<HTMLElement>('[aria-label], [title], [placeholder]').forEach((element) => {
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      const value = element.getAttribute(attribute)
      if (value) element.setAttribute(attribute, translateKnownText(value, locale))
    }
  })
}

function translateAddedNode(node: Node, locale: Locale) {
  if (node instanceof Text) {
    if (node.parentElement?.closest('textarea, .monaco-editor, code, pre, [data-i18n-ignore]'))
      return
    const translated = translateKnownText(node.nodeValue ?? '', locale)
    if (translated !== node.nodeValue) node.nodeValue = translated
  } else if (node instanceof Element) translateTree(node, locale)
}

export function applyLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
  translateTree(document.body, locale)
}

export function observeTranslations() {
  const locale = () => (i18n.resolvedLanguage === 'zh-CN' ? 'zh-CN' : 'en-US')
  const update = () => applyLocale(locale())
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateAddedNode(record.target, locale())
      else record.addedNodes.forEach((node) => translateAddedNode(node, locale()))
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  i18n.on('languageChanged', update)
  update()
  return () => {
    observer.disconnect()
    i18n.off('languageChanged', update)
  }
}

export default i18n
