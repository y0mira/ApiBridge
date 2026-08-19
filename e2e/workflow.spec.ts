import { expect, test } from '@playwright/test'

const candidate = `openapi: 3.1.0
info: { title: Minimal Petstore example, version: 2.0.0 }
paths:
  /pets:
    get:
      operationId: listPets
      responses:
        '200':
          description: changed
          content:
            application/json:
              schema:
                type: object
                required: [count]
                properties:
                  count: { type: integer }
`

test('baseline/candidate diff, error scenario and standalone MSW export', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByText('使用内置 Petstore 示例').click()
  await page.getByRole('button', { name: '导入' }).click()
  await page.getByRole('button', { name: '查看' }).first().click()
  await page.getByRole('button', { name: '打开工具' }).click()
  await page.getByRole('tab', { name: '差异' }).click()
  await expect(page).toHaveURL(/tool=diff/)
  await page.locator('.tool-editor .monaco-editor').click()
  await page.keyboard.press('ControlOrMeta+A')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((text) => navigator.clipboard.writeText(text), candidate)
  await page.keyboard.press('ControlOrMeta+V')
  await page.getByRole('button', { name: '比较版本' }).click()
  await expect(page.getByText(/breaking · endpoint-removed/i)).toBeVisible()
  await page.getByRole('tab', { name: '场景' }).click()
  await page.goBack()
  await expect(page.getByRole('tab', { name: '差异' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: '场景' }).click()
  await page.getByRole('button', { name: /500 error/ }).click()
  await page.getByRole('button', { name: '复制场景' }).click()
  await page.getByLabel('名称').fill('Server unavailable')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByRole('button', { name: '生成 MSW' }).click()
  await expect(page.getByRole('tab', { name: 'api-scenarios.ts' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载当前文件' }).click()
  expect((await download).suggestedFilename()).toBe('api-scenarios.ts')
})

test('375px can import, select an operation, validate a response and save it as a scenario', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.getByText('使用内置 Petstore 示例').click()
  await page.getByRole('button', { name: '导入' }).click()
  await page.getByRole('button', { name: '查看' }).first().click()
  await page.getByRole('button', { name: '打开工具' }).click()
  await page.getByRole('button', { name: /500 error/ }).click()
  await expect(page.getByLabel('状态码')).toHaveValue('500')
  await page.getByRole('tab', { name: '校验' }).click()
  await expect(page.getByText('真实响应校验')).toBeVisible()
  await page.locator('.tool-editor .monaco-editor').click()
  await page.keyboard.press('ControlOrMeta+A')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => navigator.clipboard.writeText('[]'))
  await page.keyboard.press('ControlOrMeta+V')
  await page.getByRole('button', { name: '校验响应' }).click()
  await expect(page.getByText('响应符合 schema')).toBeVisible()
  await page.getByRole('button', { name: '保存为场景' }).click()
  await page.getByRole('tab', { name: '场景' }).click()
  await expect(page.getByRole('button', { name: 'Real 200' })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false)
})

for (const locale of ['zh-CN', 'en-US'] as const) {
  for (const theme of ['dark', 'light'] as const) {
    for (const width of [375, 768, 1024, 1440]) {
      test(`${locale} ${theme} theme at ${width}px has no blocking overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 375 ? 667 : 900 })
        await page.goto('/')
        if (locale === 'en-US') await page.getByRole('button', { name: 'English' }).click()
        if (theme === 'light')
          await page
            .getByRole('button', {
              name: locale === 'zh-CN' ? '切换到浅色主题' : 'Switch to light theme',
            })
            .click()
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(locale)
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
          ),
        ).toBe(false)
        await page.keyboard.press('Tab')
        await expect(page.locator(':focus')).toBeVisible()
        await page.emulateMedia({ reducedMotion: 'reduce' })
        expect(
          await page.evaluate(
            () => getComputedStyle(document.documentElement).overflowX !== 'scroll',
          ),
        ).toBe(true)
      })
    }
  }
}

test('language switch persists without losing unsaved scenario state', async ({ page }) => {
  await page.goto('/')
  await page.getByText('使用内置 Petstore 示例').click()
  await page.getByRole('button', { name: '导入' }).click()
  await page.getByRole('button', { name: '查看' }).first().click()
  await page.getByRole('button', { name: '打开工具' }).click()
  await page.getByLabel('名称').fill('Unsaved scenario')
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Unsaved scenario',
  )
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
})
