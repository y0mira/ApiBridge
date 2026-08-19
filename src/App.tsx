import {
  AlertTriangle,
  Braces,
  Check,
  Clipboard,
  Code2,
  Database,
  Download,
  FileInput,
  FolderOpen,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { db } from './core/db'
import {
  generateAll,
  parseOpenApi,
  type GeneratedFile,
  type Operation,
  type Project,
  type Schema,
} from './core'
import { SAMPLE_SPEC } from './sample'
import { SchemaTree } from './components/SchemaTree'
import { WorkflowWorkbench } from './components/WorkflowWorkbench'
import { observeTranslations, type Locale } from './i18n'

const Editor = lazy(() => import('./components/LazyEditor'))

type Panel = 'projects' | 'endpoints' | 'inspector'
const uid = () => globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`

export default function App() {
  const { i18n } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project>()
  const [source, setSource] = useState('')
  const [filename, setFilename] = useState('pasted.yaml')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [inspected, setInspected] = useState<Operation>()
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [fileIndex, setFileIndex] = useState(0)
  const [activePanel, setActivePanel] = useState<Panel>('projects')
  const [copied, setCopied] = useState(false)
  const [workflowMode, setWorkflowMode] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem('api-bridge-theme') === 'light' ? 'light' : 'dark',
  )
  const [visibleLimit, setVisibleLimit] = useState(200)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => observeTranslations(), [])

  useEffect(() => {
    db.projects
      .orderBy('updatedAt')
      .reverse()
      .toArray()
      .then((items) => {
        setProjects(items)
        setBusy(false)
      })
      .catch(() => {
        setError('本地数据库无法打开。请导出仍可访问的数据后清除站点存储并重试。')
        setBusy(false)
      })
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('api-bridge-theme', theme)
  }, [theme])
  const hasErrors = project?.parsed.issues.some((issue) => issue.severity === 'error') ?? false
  const filtered = useMemo(
    () =>
      project?.parsed.operations.filter((operation) =>
        `${operation.path} ${operation.operationId ?? ''} ${operation.summary}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ) ?? [],
    [project, search],
  )
  const grouped = useMemo(
    () =>
      filtered.slice(0, visibleLimit).reduce<Record<string, Operation[]>>((result, operation) => {
        const tag = operation.tags[0] ?? 'Untagged'
        ;(result[tag] ??= []).push(operation)
        return result
      }, {}),
    [filtered, visibleLimit],
  )
  useEffect(() => setVisibleLimit(200), [search, project?.id])

  async function importSource(text: string, name: string) {
    setBusy(true)
    setError('')
    try {
      const parsed = parseOpenApi(text, name)
      const now = new Date().toISOString()
      const next: Project = {
        id: uid(),
        name: String(parsed.document.info?.title ?? name.replace(/\.(json|ya?ml)$/i, '')),
        sourceFormat: name.toLowerCase().endsWith('.json') ? 'json' : 'yaml',
        source: text,
        parsed,
        createdAt: now,
        updatedAt: now,
        selectedOperationIds: [],
      }
      await db.projects.put(next)
      setProjects((items) => [next, ...items])
      setProject(next)
      setSource(text)
      setFilename(name)
      setSelected([])
      setFiles([])
      setInspected(parsed.operations[0])
      setActivePanel('endpoints')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }
  async function readFile(file?: File) {
    if (!file) return
    if (!/\.(json|ya?ml)$/i.test(file.name)) {
      setError('请选择 .json、.yaml 或 .yml 文件。')
      return
    }
    await importSource(await file.text(), file.name)
  }
  function openProject(next: Project) {
    setProject(next)
    setSource(next.source)
    setFilename(`${next.name}.${next.sourceFormat}`)
    setSelected(next.selectedOperationIds)
    setFiles([])
    setInspected(
      next.parsed.operations.find((item) => item.id === next.selectedOperationIds[0]) ??
        next.parsed.operations[0],
    )
    setActivePanel('endpoints')
  }
  async function toggle(operation: Operation) {
    const next = selected.includes(operation.id)
      ? selected.filter((id) => id !== operation.id)
      : [...selected, operation.id]
    setSelected(next)
    setInspected(operation)
    if (project) {
      const updated = {
        ...project,
        selectedOperationIds: next,
        updatedAt: new Date().toISOString(),
      }
      setProject(updated)
      setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)))
      await db.projects.put(updated)
    }
  }
  function generate() {
    if (!project || hasErrors || !selected.length) return
    const operations = project.parsed.operations.filter((item) => selected.includes(item.id))
    setFiles(generateAll(project.parsed.document, operations))
    setFileIndex(0)
    setActivePanel('inspector')
  }
  async function removeProject(id: string) {
    if (!confirm('删除这个本地项目？此操作无法撤销。')) return
    await db.transaction('rw', db.projects, db.scenarios, db.versions, async () => {
      await db.projects.delete(id)
      await db.scenarios.where('projectId').equals(id).delete()
      await db.versions.where('projectId').equals(id).delete()
    })
    setProjects((items) => items.filter((item) => item.id !== id))
    if (project?.id === id) {
      setProject(undefined)
      setSource('')
      setSelected([])
      setFiles([])
    }
  }
  async function clearAll() {
    if (!confirm('清空全部本地项目？此操作无法撤销。')) return
    await db.transaction('rw', db.projects, db.scenarios, db.versions, async () => {
      await Promise.all([db.projects.clear(), db.scenarios.clear(), db.versions.clear()])
    })
    setProjects([])
    setProject(undefined)
    setSource('')
    setSelected([])
    setFiles([])
  }
  async function copyCode() {
    if (!files[fileIndex]) return
    await navigator.clipboard.writeText(files[fileIndex].content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  function download() {
    const file = files[fileIndex]
    if (!file) return
    const url = URL.createObjectURL(
      new Blob([file.content], { type: 'text/typescript;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="app-shell"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        void readFile(event.dataTransfer.files[0])
      }}
    >
      <header className="topbar">
        <div className="brand">
          <Braces size={20} />
          <strong>API Bridge</strong>
          <span className="stage">Workflow · local only</span>
        </div>
        <div className="top-actions">
          <div className="privacy">
            <ShieldCheck size={15} /> 规范只保存在此浏览器
          </div>
          <div className="language-switch" role="group" aria-label="语言">
            {(['zh-CN', 'en-US'] as Locale[]).map((locale) => (
              <button
                key={locale}
                className="language-button"
                aria-pressed={i18n.resolvedLanguage === locale}
                onClick={() => void i18n.changeLanguage(locale)}
              >
                {locale === 'zh-CN' ? '中文' : 'English'}
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}主题`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <div className="sr-only" role="status" aria-live="polite">
        {copied ? '代码已复制' : ''}
      </div>
      <nav className="mobile-nav" aria-label="工作区导航">
        {(
          [
            ['projects', '项目', Database],
            ['endpoints', '接口', Menu],
            ['inspector', '检查器', Code2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            className={activePanel === id ? 'active' : ''}
            onClick={() => setActivePanel(id)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <main className="workspace">
        <aside
          className={`panel projects-panel ${activePanel === 'projects' ? 'mobile-active' : ''}`}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 / SOURCE</span>
              <h1>Projects</h1>
            </div>
            <button
              className="icon-button"
              onClick={clearAll}
              disabled={!projects.length}
              title="清空本地数据"
              aria-label="清空本地数据"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <section className="import-card">
            <label>粘贴 OpenAPI JSON / YAML</label>
            <div className="source-editor">
              <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
                <Editor
                  height="94px"
                  language={filename.endsWith('.json') ? 'json' : 'yaml'}
                  theme="vs-dark"
                  value={source}
                  onChange={(value) => setSource(value ?? '')}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    folding: false,
                    fontSize: 11,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 7 },
                    ariaLabel: '粘贴 OpenAPI JSON / YAML',
                  }}
                />
              </Suspense>
            </div>
            <div className="button-row">
              <button className="button secondary" onClick={() => fileInput.current?.click()}>
                <FolderOpen size={15} />
                选择文件
              </button>
              <button
                className="button primary"
                disabled={!source.trim() || busy}
                onClick={() => void importSource(source, filename)}
              >
                <Upload size={15} />
                {busy ? '解析中…' : '导入'}
              </button>
            </div>
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".json,.yaml,.yml,application/json"
              onChange={(event) => void readFile(event.target.files?.[0])}
            />
            <button
              className="sample-link"
              onClick={() => {
                setSource(SAMPLE_SPEC)
                setFilename('example-petstore.yaml')
              }}
            >
              使用内置 Petstore 示例
            </button>
            <div className="drop-hint">
              <FileInput size={15} />
              也可拖拽文件到页面 · 最大 10 MiB
            </div>
          </section>
          {error && (
            <div className="notice error" role="alert">
              <AlertTriangle size={16} />
              <div>
                <strong>无法导入</strong>
                <p>{error}</p>
              </div>
              <button className="icon-button" onClick={() => setError('')} aria-label="关闭错误">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="history-label">
            本地历史 <span>{projects.length}</span>
          </div>
          {!busy && !projects.length && (
            <div className="empty compact">
              <Database size={22} />
              <p>导入第一份规范后，它会出现在这里。</p>
            </div>
          )}
          <div className="project-list">
            {projects.map((item) => (
              <div
                key={item.id}
                className={`project-item ${project?.id === item.id ? 'selected' : ''}`}
              >
                <button onClick={() => openProject(item)}>
                  <strong>{item.name}</strong>
                  <span>
                    OpenAPI {item.parsed.version} · {item.parsed.operations.length} endpoints
                  </span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => void removeProject(item.id)}
                  aria-label={`删除 ${item.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>
        <section
          className={`panel endpoint-panel ${activePanel === 'endpoints' ? 'mobile-active' : ''}`}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">02 / CONTRACT</span>
              <h2>Endpoints</h2>
            </div>
            {project && <span className="count">{selected.length} selected</span>}
          </div>
          {!project ? (
            <div className="empty">
              <FileInput size={30} />
              <h3>导入一份 API 契约</h3>
              <p>选择文件、粘贴文本或载入明确标注的示例。</p>
            </div>
          ) : (
            <>
              <label className="search" htmlFor="endpoint-search">
                <Search size={16} />
                <span className="sr-only">搜索 endpoint</span>
                <input
                  id="endpoint-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索 path、operationId、summary"
                />
              </label>
              <div className="issue-strip">
                {project.parsed.issues.length ? (
                  project.parsed.issues.map((issue, index) => (
                    <div key={`${issue.code}-${index}`} className={`issue ${issue.severity}`}>
                      <AlertTriangle size={14} />
                      <span>
                        <strong>{issue.severity}</strong> {issue.message}
                        {issue.path && <code>{issue.path}</code>}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="issue ok">
                    <Check size={14} />
                    规范校验通过
                  </div>
                )}
              </div>
              <div className="endpoint-list">
                {!filtered.length ? (
                  <div className="empty compact">
                    <Search size={22} />
                    <p>没有匹配的 endpoint。</p>
                  </div>
                ) : (
                  <>
                    {Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([tag, operations]) => (
                        <section key={tag}>
                          <h3 className="tag-heading">
                            {tag} <span>{operations?.length}</span>
                          </h3>
                          {operations?.map((operation) => (
                            <div
                              key={operation.id}
                              className={`endpoint ${inspected?.id === operation.id ? 'inspected' : ''}`}
                            >
                              <input
                                id={`op-${operation.id}`}
                                type="checkbox"
                                checked={selected.includes(operation.id)}
                                onChange={() => void toggle(operation)}
                              />
                              <label htmlFor={`op-${operation.id}`}>
                                <span className={`method ${operation.method.toLowerCase()}`}>
                                  {operation.method}
                                </span>
                                <code>{operation.path}</code>
                                <span className="summary">
                                  {operation.summary || 'No summary'}
                                  {operation.deprecated && (
                                    <span className="badge danger">deprecated</span>
                                  )}
                                </span>
                                <small>
                                  {operation.operationId ?? `${operation.id} · generated id`}
                                </small>
                              </label>
                              <button
                                className="inspect-button"
                                onClick={() => {
                                  setInspected(operation)
                                  setActivePanel('inspector')
                                }}
                              >
                                查看
                              </button>
                            </div>
                          ))}
                        </section>
                      ))}
                    {visibleLimit < filtered.length && (
                      <button
                        className="load-more"
                        onClick={() => setVisibleLimit((value) => value + 200)}
                      >
                        显示更多（{filtered.length - visibleLimit}）
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="generate-bar">
                <button
                  className="button primary wide"
                  disabled={!selected.length || hasErrors}
                  onClick={generate}
                >
                  <Code2 size={16} />
                  生成 {selected.length ? `${selected.length} 个接口` : '代码'}
                </button>
                {hasErrors && <small>先修复阻塞错误</small>}
              </div>
            </>
          )}
        </section>
        <section
          className={`panel inspector-panel ${activePanel === 'inspector' ? 'mobile-active' : ''}`}
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">03 / WORKBENCH</span>
              <h2>{files.length ? 'Generated code' : workflowMode ? 'Workflow' : 'Inspector'}</h2>
            </div>
            <div className="icon-actions">
              {inspected && !files.length && (
                <button className="mode-button" onClick={() => setWorkflowMode(!workflowMode)}>
                  {workflowMode ? '契约详情' : '打开工具'}
                </button>
              )}
              {files.length > 0 && (
                <>
                  <button className="mode-button" onClick={() => setFiles([])}>
                    返回工具
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => void copyCode()}
                    aria-label="复制代码"
                    title="复制代码"
                  >
                    {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  </button>
                  <button
                    className="icon-button"
                    onClick={download}
                    aria-label="下载当前文件"
                    title="下载当前文件"
                  >
                    <Download size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          {files.length ? (
            <>
              <div className="tabs" role="tablist">
                {files.map((file, index) => (
                  <button
                    role="tab"
                    aria-selected={fileIndex === index}
                    key={file.name}
                    className={fileIndex === index ? 'active' : ''}
                    onClick={() => setFileIndex(index)}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
              {files[fileIndex].warnings.length > 0 && (
                <div className="warnings">
                  {files[fileIndex].warnings.map((warning) => (
                    <div key={warning}>
                      <AlertTriangle size={14} />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
              <div className="contract-bridge code-bridge">
                <span>OpenAPI operation</span>
                <i>→</i>
                <span>{inspected?.id ?? 'selection'}</span>
                <i>→</i>
                <span>{files[fileIndex].name}</span>
              </div>
              <div className="editor-wrap">
                <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
                  <Editor
                    height="100%"
                    language="typescript"
                    theme="vs-dark"
                    value={files[fileIndex].content}
                    onChange={(value) =>
                      setFiles((items) =>
                        items.map((item, index) =>
                          index === fileIndex ? { ...item, content: value ?? '' } : item,
                        ),
                      )
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      wordWrap: 'off',
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      padding: { top: 14 },
                      ariaLabel: `编辑 ${files[fileIndex].name}`,
                    }}
                  />
                </Suspense>
              </div>
            </>
          ) : inspected && project ? (
            workflowMode ? (
              <WorkflowWorkbench
                project={project}
                operation={inspected}
                onGenerated={(name, content) => {
                  setFiles([{ name, content, language: 'typescript', warnings: [] }])
                  setFileIndex(0)
                }}
              />
            ) : (
              <OperationInspector operation={inspected} />
            )
          ) : (
            <div className="empty">
              <Code2 size={30} />
              <h3>选择一个 endpoint</h3>
              <p>这里会显示参数、响应和 schema。生成后可编辑、复制和分别下载。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function OperationInspector({ operation }: { operation: Operation }) {
  return (
    <div className="inspector-content">
      <div className="operation-title">
        <span className={`method ${operation.method.toLowerCase()}`}>{operation.method}</span>
        <code>{operation.path}</code>
      </div>
      <p>{operation.summary || 'No summary provided.'}</p>
      <h3>Parameters</h3>
      {operation.parameters.length ? (
        <div className="data-table">
          {operation.parameters.map((item) => (
            <div key={`${item.in}-${item.name}`}>
              <code>{item.name}</code>
              <span>{item.in}</span>
              <span>{item.required ? 'required' : 'optional'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No parameters.</p>
      )}
      {operation.body && (
        <>
          <h3>
            Request body <span className="muted">{operation.body.contentType}</span>
          </h3>
          {operation.body.schema && <SchemaTree schema={operation.body.schema} />}
        </>
      )}
      <h3>Responses</h3>
      {operation.responses.map((response) => (
        <div className="response" key={`${response.status}-${response.contentType}`}>
          <div>
            <span className="status">{response.status}</span>
            <code>{response.contentType}</code>
          </div>
          {response.schema ? (
            <SchemaTree schema={response.schema as Schema} />
          ) : (
            <p className="muted">No response schema.</p>
          )}
        </div>
      ))}
    </div>
  )
}
