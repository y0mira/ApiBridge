import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { db } from './core/db'

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({}))
vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn() },
  default: ({
    value,
    onChange,
    options,
  }: {
    value: string
    onChange?: (value: string) => void
    options?: { ariaLabel?: string }
  }) => (
    <textarea
      aria-label={options?.ariaLabel ?? 'generated editor'}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}))
beforeEach(async () => {
  localStorage.setItem('api-bridge-language', 'zh-CN')
  await import('./i18n').then(({ default: i18n }) => i18n.changeLanguage('zh-CN'))
  await db.projects.clear()
  await db.scenarios.clear()
  await db.versions.clear()
})
describe('workspace', () => {
  it('shows an actionable empty state and import error', async () => {
    render(<App />)
    expect(await screen.findByText('导入一份 API 契约')).toBeInTheDocument()
    await userEvent.type((await screen.findAllByRole('textbox'))[0], 'broken document')
    await userEvent.click(screen.getByRole('button', { name: '导入' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/文档根节点|仅支持/)
  })
  it('imports the sample, searches, selects, generates, copies and exposes download', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('使用内置 Petstore 示例')).toBeEnabled())
    await userEvent.click(screen.getByText('使用内置 Petstore 示例'))
    await userEvent.click(screen.getByRole('button', { name: '导入' }))
    expect(await screen.findByText('/pets/{petId}')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('搜索 endpoint'), 'getPet')
    expect(screen.getByText('/pets/{petId}')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /生成 1 个接口/ }))
    expect(await screen.findByRole('tab', { name: 'api-types.ts' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '复制代码' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '下载当前文件' })).toBeEnabled()
  })
  it('opens workflow tools, creates a scenario copy and switches theme', async () => {
    render(<App />)
    await userEvent.click(await screen.findByText('使用内置 Petstore 示例'))
    await userEvent.click(screen.getByRole('button', { name: '导入' }))
    await screen.findByText('/pets/{petId}')
    await userEvent.click(screen.getByRole('button', { name: '打开工具' }))
    expect(await screen.findByText('Mock 场景')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '复制场景' }))
    expect(screen.getByText(/copy/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '切换到浅色主题' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    await userEvent.click(screen.getByRole('tab', { name: '样本' }))
    expect(screen.getByText('确定性样本')).toBeInTheDocument()
  })
  it('renders malicious imported text as inert data', async () => {
    render(<App />)
    const source = `openapi: 3.1.0\ninfo: {title: "<img src=x onerror=globalThis.__xss=true>", version: 1}\npaths: {}`
    const file = new File([source], 'hostile.yaml', { type: 'application/yaml' })
    Object.defineProperty(file, 'text', { value: async () => source })
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file)
    expect(await screen.findByText('<img src=x onerror=globalThis.__xss=true>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    expect((globalThis as typeof globalThis & { __xss?: boolean }).__xss).toBeUndefined()
  })
})
