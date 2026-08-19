import { expect, test } from '@playwright/test'

for (const width of [375, 768, 1024, 1440]) test(`main flow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 375 ? 667 : 900 })
  await page.goto('/')
  await page.getByText('使用内置 Petstore 示例').click()
  await page.getByRole('button', { name: '导入' }).click()
  if (width < 1024) await page.getByRole('button', { name: /接口/ }).click()
  await page.locator('label').filter({ hasText: '/pets/{petId}' }).click()
  await page.getByRole('button', { name: /生成 1 个接口/ }).click()
  await expect(page.getByText('api-types.ts')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载当前文件' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('api-types.ts')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})
