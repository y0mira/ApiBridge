import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileDiff,
  FlaskConical,
  Layers3,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { db } from '../core/db'
import {
  createPresetScenarios,
  diffOpenApi,
  diffToJson,
  diffToMarkdown,
  duplicateScenario,
  fixtureExports,
  generateFixture,
  generateIntentionalVariant,
  generateScenarioMsw,
  moveScenario,
  normalizeScenarios,
  parseOpenApi,
  redactSensitive,
  sequenceStep,
  validateValue,
  validateScenarioJson,
  type BoundaryVariant,
  type DiffItem,
  type MockScenario,
  type Operation,
  type Project,
  type Schema,
  type ValidationIssue,
} from '../core'

const Editor = lazy(() => import('./LazyEditor'))
type Tool = 'scenarios' | 'fixtures' | 'diff' | 'validate'
type Props = {
  project: Project
  operation: Operation
  onGenerated: (name: string, content: string) => void
}
const toolLabels: Record<Tool, string> = {
  scenarios: 'Scenarios',
  fixtures: 'Fixtures',
  diff: 'Diff',
  validate: 'Validate',
}
const downloadText = (name: string, content: string, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function WorkflowWorkbench({ project, operation, onGenerated }: Props) {
  const initialTool = (new URLSearchParams(location.search).get('tool') as Tool) || 'scenarios'
  const [tool, setToolState] = useState<Tool>(
    Object.keys(toolLabels).includes(initialTool) ? initialTool : 'scenarios',
  )
  const [scenarios, setScenarios] = useState<MockScenario[]>([])
  const [activeScenario, setActiveScenario] = useState('')
  const [saved, setSaved] = useState(true)
  const [fixtureCount, setFixtureCount] = useState(3)
  const [fixtureSeed, setFixtureSeed] = useState(42)
  const [fixtureText, setFixtureText] = useState('')
  const [fixtureOverrides, setFixtureOverrides] = useState('{}')
  const [boundaryVariant, setBoundaryVariant] = useState<BoundaryVariant | ''>('')
  const [intentionalViolation, setIntentionalViolation] = useState(false)
  const [fixtureError, setFixtureError] = useState('')
  const [candidate, setCandidate] = useState('')
  const [diffItems, setDiffItems] = useState<DiffItem[]>([])
  const [diffBusy, setDiffBusy] = useState(false)
  const [diffError, setDiffError] = useState('')
  const [selectedDiff, setSelectedDiff] = useState<DiffItem>()
  const [responseStatus, setResponseStatus] = useState('200')
  const [responseText, setResponseText] = useState('{}')
  const [responseHeaders, setResponseHeaders] = useState('Content-Type: application/json')
  const [validation, setValidation] = useState<ValidationIssue[] | null>(null)
  const diffWorker = useRef<Worker | null>(null)
  const diffRun = useRef(0)
  const active = scenarios.find((item) => item.id === activeScenario)
  const response =
    operation.responses.find((item) => item.status === responseStatus) ?? operation.responses[0]
  useEffect(() => {
    db.scenarios
      .where('operationId')
      .equals(operation.id)
      .toArray()
      .then((stored) => {
        const relevant = stored.filter((item) => item.projectId === project.id)
        const next = relevant.length
          ? normalizeScenarios(relevant)
          : createPresetScenarios(operation)
        setScenarios(next)
        setActiveScenario(next[0]?.id ?? '')
      })
  }, [operation, project.id])
  useEffect(
    () => () => {
      diffRun.current += 1
      diffWorker.current?.terminate()
    },
    [project.id],
  )
  useEffect(() => {
    const listener = () => {
      const next = new URLSearchParams(location.search).get('tool') as Tool
      if (next && Object.keys(toolLabels).includes(next)) setToolState(next)
    }
    addEventListener('popstate', listener)
    return () => removeEventListener('popstate', listener)
  }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!saved) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [saved])
  const setTool = (next: Tool) => {
    setToolState(next)
    const params = new URLSearchParams(location.search)
    params.set('project', project.id)
    params.set('operation', operation.id)
    params.set('tool', next)
    history.pushState({}, '', `${location.pathname}?${params}`)
  }
  const updateActive = (patch: Partial<MockScenario>) => {
    setScenarios((items) =>
      items.map((item) => (item.id === activeScenario ? { ...item, ...patch } : item)),
    )
    setSaved(false)
  }
  const save = async () => {
    if (!active) return
    const normalized = normalizeScenarios(scenarios, active.isDefault ? active.id : undefined).map(
      (item) => ({ ...item, projectId: project.id }),
    )
    await db.transaction('rw', db.scenarios, async () => {
      await db.scenarios
        .where('operationId')
        .equals(operation.id)
        .filter((item) => item.projectId === project.id)
        .delete()
      await db.scenarios.bulkPut(normalized)
    })
    setScenarios(normalized)
    setSaved(true)
  }
  const generateFixtures = () => {
    try {
      setFixtureError('')
      const schema = response?.schema as Schema | undefined
      const overrides = JSON.parse(fixtureOverrides)
      const values =
        intentionalViolation && boundaryVariant && schema
          ? [generateIntentionalVariant(schema, boundaryVariant)]
          : generateFixture(schema, project.parsed.document, {
              seed: fixtureSeed,
              count: fixtureCount,
              overrides,
              variants: boundaryVariant ? { '#': boundaryVariant } : undefined,
            })
      setFixtureText(JSON.stringify(values, null, 2))
    } catch (error) {
      setFixtureError(error instanceof Error ? error.message : String(error))
    }
  }
  const runDiff = async () => {
    const run = ++diffRun.current
    diffWorker.current?.terminate()
    setDiffBusy(true)
    setDiffError('')
    try {
      const parsed = parseOpenApi(candidate, 'candidate.yaml')
      if (parsed.issues.some((item) => item.severity === 'error'))
        throw new Error(
          parsed.issues
            .filter((item) => item.severity === 'error')
            .map((item) => item.message)
            .join('；'),
        )
      await db.versions.put({
        id: `${project.id}--candidate`,
        projectId: project.id,
        name: 'candidate',
        source: candidate,
        parsed,
        createdAt: new Date().toISOString(),
      })
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../workers/diff.worker.ts', import.meta.url), {
          type: 'module',
        })
        diffWorker.current = worker
        const result = await new Promise<DiffItem[]>((resolve, reject) => {
          worker.onmessage = (event) => resolve(event.data)
          worker.onerror = () => reject(new Error('Diff Worker 执行失败。'))
          worker.postMessage({ baseline: project.parsed, candidate: parsed })
        })
        worker.terminate()
        if (run === diffRun.current) setDiffItems(result)
      } else
        setDiffItems(
          diffOpenApi(
            project.parsed.document,
            project.parsed.operations,
            parsed.document,
            parsed.operations,
          ),
        )
    } catch (error) {
      if (run === diffRun.current)
        setDiffError(error instanceof Error ? error.message : String(error))
    } finally {
      if (run === diffRun.current) setDiffBusy(false)
    }
  }
  const validate = () => {
    try {
      const value = response?.contentType.includes('json') ? JSON.parse(responseText) : responseText
      setValidation(validateValue(value, response?.schema, project.parsed.document))
    } catch (error) {
      setValidation([
        {
          pointer: '#',
          expected: 'valid JSON',
          actual: 'syntax error',
          message: error instanceof Error ? error.message : String(error),
          suggestion: '修复 JSON 语法后重试。',
        },
      ])
    }
  }
  const saveResponseScenario = async () => {
    if (validation?.length || !response) return
    const scenario = {
      ...createPresetScenarios(operation)[0],
      id: `${operation.id}--real-${responseStatus}`,
      name: `Real ${responseStatus}`,
      isDefault: false,
      status: Number(responseStatus),
      headers: Object.fromEntries(
        responseHeaders
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const index = line.indexOf(':')
            return index < 0
              ? [line.trim(), '']
              : [line.slice(0, index).trim(), line.slice(index + 1).trim()]
          }),
      ),
      bodyType: response.contentType.includes('json') ? ('json' as const) : ('text' as const),
      body: responseText,
    }
    const next = [...scenarios.filter((item) => item.id !== scenario.id), scenario]
    setScenarios(next)
    setActiveScenario(scenario.id)
    setSaved(false)
    setTool('scenarios')
  }
  return (
    <div className="workflow">
      <div className="workflow-tabs" role="tablist">
        {(Object.keys(toolLabels) as Tool[]).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tool === id}
            className={tool === id ? 'active' : ''}
            onClick={() => setTool(id)}
          >
            {toolLabels[id]}
          </button>
        ))}
      </div>
      {tool === 'scenarios' && (
        <div className="tool-pane">
          <div className="tool-head">
            <div>
              <h3>Mock scenarios</h3>
              <p>
                通过 query <code>_scenario</code>、header <code>x-api-scenario</code> 或 runtime
                配置选择。
              </p>
            </div>
            <button className="button primary" onClick={() => void save()} disabled={saved}>
              <Save size={15} />
              {saved ? '已保存' : '保存'}
            </button>
          </div>
          <div className="scenario-layout">
            <div className="scenario-list">
              {scenarios.map((item, index) => (
                <button
                  key={item.id}
                  className={item.id === activeScenario ? 'active' : ''}
                  onClick={() => setActiveScenario(item.id)}
                >
                  <span>{item.name}</span>
                  <small>
                    {item.failure === 'none' ? item.status : item.failure}
                    {item.isDefault ? ' · default' : ''}
                  </small>
                  <span className="scenario-actions">
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        setScenarios((list) => moveScenario(list, index, index - 1))
                        setSaved(false)
                      }}
                      aria-label="上移"
                    >
                      <ArrowUp size={13} />
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation()
                        setScenarios((list) => moveScenario(list, index, index + 1))
                        setSaved(false)
                      }}
                      aria-label="下移"
                    >
                      <ArrowDown size={13} />
                    </span>
                  </span>
                </button>
              ))}
              <button
                className="add-scenario"
                onClick={() => {
                  const copy = duplicateScenario(
                    active ?? createPresetScenarios(operation)[0],
                    scenarios,
                  )
                  setScenarios([...scenarios, copy])
                  setActiveScenario(copy.id)
                  setSaved(false)
                }}
              >
                <Copy size={14} />
                复制场景
              </button>
            </div>
            {active && (
              <div className="scenario-form">
                <label>
                  名称
                  <input
                    value={active.name}
                    onChange={(event) => updateActive({ name: event.target.value })}
                  />
                </label>
                <div className="field-row">
                  <label>
                    状态码
                    <input
                      type="number"
                      min="100"
                      max="599"
                      value={active.status}
                      onChange={(event) => updateActive({ status: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    延迟（毫秒）
                    <input
                      type="number"
                      min="0"
                      max="30000"
                      value={active.delayMs}
                      onChange={(event) => updateActive({ delayMs: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    失败模式
                    <select
                      value={active.failure}
                      onChange={(event) =>
                        updateActive({ failure: event.target.value as MockScenario['failure'] })
                      }
                    >
                      <option value="none">正常响应</option>
                      <option value="network-error">网络错误</option>
                      <option value="connection-refused">连接拒绝</option>
                      <option value="timeout">超时</option>
                    </select>
                  </label>
                  <label>
                    Body 类型
                    <select
                      value={active.bodyType}
                      onChange={(event) =>
                        updateActive({ bodyType: event.target.value as MockScenario['bodyType'] })
                      }
                    >
                      <option value="json">JSON</option>
                      <option value="text">Text</option>
                    </select>
                  </label>
                </div>
                <label>
                  Headers（每行 Name: Value）
                  <textarea
                    value={Object.entries(active.headers)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n')}
                    onChange={(event) =>
                      updateActive({
                        headers: Object.fromEntries(
                          event.target.value
                            .split('\n')
                            .filter(Boolean)
                            .map((line) => {
                              const index = line.indexOf(':')
                              return index < 0
                                ? [line.trim(), '']
                                : [line.slice(0, index).trim(), line.slice(index + 1).trim()]
                            }),
                        ),
                      })
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={active.isDefault}
                    onChange={() => {
                      setScenarios(normalizeScenarios(scenarios, active.id))
                      setSaved(false)
                    }}
                  />
                  设为唯一默认场景
                </label>
                <div className="sequence-row">
                  <span>
                    响应序列：{active.sequence.length ? `${active.sequence.length} steps` : '关闭'}
                  </span>
                  <button
                    className="button secondary"
                    onClick={() =>
                      updateActive({
                        sequence: active.sequence.length
                          ? []
                          : [
                              sequenceStep(202, { state: 'pending' }),
                              sequenceStep(202, { state: 'pending' }),
                              sequenceStep(200, { state: 'completed' }),
                            ],
                      })
                    }
                  >
                    {active.sequence.length ? '清除序列' : '添加 pending → completed'}
                  </button>
                </div>
                <label>JSON / text body</label>
                <div className="tool-editor">
                  <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
                    <Editor
                      height="230px"
                      language={active.bodyType}
                      theme="vs-dark"
                      value={active.body}
                      onChange={(value) => updateActive({ body: value ?? '' })}
                      options={{
                        minimap: { enabled: false },
                        automaticLayout: true,
                        ariaLabel: '场景响应 Body',
                      }}
                    />
                  </Suspense>
                </div>
                {validateScenarioJson(active) && (
                  <div className="inline-error">
                    <AlertTriangle size={14} />
                    {validateScenarioJson(active)}
                  </div>
                )}
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => {
                      if (!confirm('删除这个场景？')) return
                      const next = normalizeScenarios(
                        scenarios.filter((item) => item.id !== active.id),
                      )
                      setScenarios(next)
                      setActiveScenario(next[0]?.id ?? '')
                      setSaved(false)
                    }}
                  >
                    删除
                  </button>
                  <button
                    className="button primary"
                    onClick={() =>
                      onGenerated(
                        'api-scenarios.ts',
                        generateScenarioMsw(project.parsed.document, operation, scenarios),
                      )
                    }
                  >
                    <Download size={15} />
                    生成 MSW
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {tool === 'fixtures' && (
        <div className="tool-pane">
          <div className="tool-head">
            <div>
              <h3>Deterministic fixtures</h3>
              <p>固定 seed、稳定 ID；默认只生成契约允许的数据。</p>
            </div>
            <FlaskConical size={20} />
          </div>
          <div className="field-row">
            <label>
              数量
              <input
                type="number"
                min="1"
                max="1000"
                value={fixtureCount}
                onChange={(e) => setFixtureCount(Number(e.target.value))}
              />
            </label>
            <label>
              Seed
              <input
                type="number"
                value={fixtureSeed}
                onChange={(e) => setFixtureSeed(Number(e.target.value))}
              />
            </label>
            <button className="button primary" onClick={generateFixtures}>
              生成 Fixture
            </button>
          </div>
          <div className="field-row">
            <label>
              边界变体
              <select
                value={boundaryVariant}
                onChange={(event) => setBoundaryVariant(event.target.value as BoundaryVariant | '')}
              >
                <option value="">契约默认值</option>
                <option value="empty-string">空字符串</option>
                <option value="null">null</option>
                <option value="zero">零</option>
                <option value="negative">负数</option>
                <option value="long-text">极长文本</option>
                <option value="unicode">Unicode</option>
                <option value="empty-array">空数组</option>
                <option value="large-list">大列表</option>
                <option value="min-date">最小日期</option>
                <option value="max-date">最大日期</option>
                <option value="unknown-enum">未知 enum</option>
              </select>
            </label>
            <label>
              Overrides JSON
              <input
                value={fixtureOverrides}
                onChange={(event) => setFixtureOverrides(event.target.value)}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={intentionalViolation}
              onChange={(event) => setIntentionalViolation(event.target.checked)}
            />
            故意违反契约（导出时独立标记）
          </label>
          {fixtureError && (
            <div className="inline-error" role="alert">
              <AlertTriangle size={14} />
              {fixtureError}
            </div>
          )}
          <div className="tool-editor">
            <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
              <Editor
                height="300px"
                language="json"
                theme="vs-dark"
                value={fixtureText}
                onChange={(value) => setFixtureText(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  automaticLayout: true,
                  ariaLabel: 'Fixture JSON',
                }}
              />
            </Suspense>
          </div>
          <div className="button-row">
            {(['json', 'typescript', 'factory'] as const).map((kind) => (
              <button
                className="button secondary"
                key={kind}
                disabled={!fixtureText}
                onClick={() => {
                  const values = JSON.parse(fixtureText)
                  const output = fixtureExports('ApiFixture', values)
                  downloadText(
                    kind === 'json'
                      ? 'api-fixture.json'
                      : kind === 'typescript'
                        ? 'api-fixture.ts'
                        : 'api-factory.ts',
                    output[kind],
                  )
                }}
              >
                导出 {kind}
              </button>
            ))}
          </div>
        </div>
      )}
      {tool === 'diff' && (
        <div className="tool-pane">
          <div className="tool-head">
            <div>
              <h3>OpenAPI version diff</h3>
              <p>当前项目是 baseline；粘贴 candidate 后在 Worker 中比较。</p>
            </div>
            <FileDiff size={20} />
          </div>
          <label>Candidate OpenAPI</label>
          <label>
            导入 candidate 文件
            <input
              type="file"
              accept=".json,.yaml,.yml,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void file.text().then(setCandidate)
              }}
            />
          </label>
          <div className="tool-editor">
            <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
              <Editor
                height="220px"
                language="yaml"
                theme="vs-dark"
                value={candidate}
                onChange={(value) => setCandidate(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  automaticLayout: true,
                  ariaLabel: 'Candidate OpenAPI',
                }}
              />
            </Suspense>
          </div>
          <button
            className="button primary"
            disabled={!candidate || diffBusy}
            onClick={() => void runDiff()}
          >
            {diffBusy ? '比较中…' : '比较版本'}
          </button>
          {diffError && (
            <div className="inline-error" role="alert">
              <AlertTriangle size={14} />
              {diffError}
            </div>
          )}
          <div className="diff-list">
            {diffItems.map((item) => (
              <button
                key={`${item.pointer}-${item.kind}`}
                className={`diff-item ${item.severity}`}
                onClick={() => setSelectedDiff(item)}
              >
                <span className="diff-icon">
                  {item.severity === 'breaking' ? '×' : item.severity === 'warning' ? '!' : '+'}
                </span>
                <span>
                  <strong>
                    {item.severity} · {item.kind}
                  </strong>
                  <code>{item.pointer}</code>
                  <small>{item.reason}</small>
                </span>
              </button>
            ))}
          </div>
          {selectedDiff && (
            <div className="contract-bridge">
              <span>OpenAPI baseline</span>
              <i>→</i>
              <span>{selectedDiff.pointer}</span>
              <i>→</i>
              <span>
                {selectedDiff.after === undefined
                  ? `映射断点：${selectedDiff.reason}`
                  : 'candidate field'}
              </span>
            </div>
          )}
          {diffItems.length > 0 && (
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() =>
                  downloadText('openapi-diff.md', diffToMarkdown(diffItems), 'text/markdown')
                }
              >
                导出 Markdown
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  downloadText('openapi-diff.json', diffToJson(diffItems), 'application/json')
                }
              >
                导出 JSON
              </button>
            </div>
          )}
        </div>
      )}
      {tool === 'validate' && (
        <div className="tool-pane">
          <div className="tool-head">
            <div>
              <h3>Real response validation</h3>
              <p>仅校验粘贴或导入的数据，不请求远程服务器。</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <label>
            响应状态码
            <select
              value={responseStatus}
              onChange={(event) => setResponseStatus(event.target.value)}
            >
              {operation.responses.map((item) => (
                <option key={item.status}>{item.status}</option>
              ))}
            </select>
          </label>
          <label>
            Response headers（每行 Name: Value）
            <textarea
              value={responseHeaders}
              onChange={(event) => setResponseHeaders(event.target.value)}
            />
          </label>
          <label>
            导入一次真实响应
            <input
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void file.text().then(setResponseText)
              }}
            />
          </label>
          <div className="tool-editor">
            <Suspense fallback={<div className="editor-loading">加载编辑器…</div>}>
              <Editor
                height="240px"
                language="json"
                theme="vs-dark"
                value={responseText}
                onChange={(value) => setResponseText(value ?? '')}
                options={{
                  minimap: { enabled: false },
                  automaticLayout: true,
                  ariaLabel: '真实响应 JSON',
                }}
              />
            </Suspense>
          </div>
          <button className="button primary" onClick={validate}>
            校验响应
          </button>
          {validation && (
            <div className={`validation-summary ${validation.length ? 'failed' : 'passed'}`}>
              {validation.length ? (
                <>
                  <AlertTriangle size={15} />
                  {validation.length} 个契约问题
                </>
              ) : (
                <>
                  <Check size={15} />
                  响应符合 schema
                </>
              )}
            </div>
          )}
          <div className="validation-list">
            {validation?.map((item) => (
              <button key={`${item.pointer}-${item.message}`} className="validation-item">
                <code>{item.pointer}</code>
                <strong>{item.message}</strong>
                <small>
                  期望 {item.expected} · 实际 {item.actual}
                </small>
                <small>{item.suggestion}</small>
              </button>
            ))}
          </div>
          <div className="contract-bridge">
            <span>OpenAPI field</span>
            <i>→</i>
            <span>{validation?.[0]?.pointer ?? 'schema'}</span>
            <i>→</i>
            <span>{validation?.length ? '映射断点：响应不匹配' : 'generated type'}</span>
          </div>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={!validation || validation.length > 0}
              onClick={() => void saveResponseScenario()}
            >
              <Layers3 size={15} />
              保存为场景
            </button>
            <button
              className="button secondary"
              onClick={() => {
                try {
                  downloadText(
                    'response-redacted.json',
                    `${JSON.stringify(redactSensitive(JSON.parse(responseText)), null, 2)}\n`,
                    'application/json',
                  )
                } catch {
                  return
                }
              }}
            >
              脱敏导出
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
