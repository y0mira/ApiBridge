import { describe, expect, it } from 'vitest'
import i18n, { applyLocale, messages, translateKnownText } from './i18n'

describe('i18n', () => {
  it('keeps locale key sets identical and translates known UI text', async () => {
    const zh = Object.keys(i18n.getResourceBundle('zh-CN', 'translation')).sort()
    const en = Object.keys(i18n.getResourceBundle('en-US', 'translation')).sort()
    expect(zh).toEqual(en)
    expect(en).toEqual(Object.keys(messages).sort())
    expect(translateKnownText('生成 12 个接口', 'en-US')).toBe('Generate 12 endpoint(s)')
  })

  it('persists locale and updates html lang without reloading', () => {
    applyLocale('en-US')
    expect(document.documentElement.lang).toBe('en-US')
    expect(localStorage.getItem('api-bridge-language')).toBe('en-US')
  })
})
