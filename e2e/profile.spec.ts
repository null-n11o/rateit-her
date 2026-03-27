import { test, expect } from '@playwright/test'

test.describe('プロフィールページ', () => {
  test('ページにアクセスできる', async ({ page }) => {
    await page.goto('/ja/profile')
    await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible()
  })

  test('未評価の場合は誘導メッセージが表示される', async ({ page }) => {
    // 新規セッション（評価なし）でアクセス
    await page.context().clearCookies()
    await page.goto('/ja/profile')
    await expect(page.getByText(/まだ評価した芸能人がいません/)).toBeVisible()
  })
})
