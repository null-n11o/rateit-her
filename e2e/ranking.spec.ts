import { test, expect } from '@playwright/test'

test.describe('ランキングページ', () => {
  test('トップページにアクセスできる', async ({ page }) => {
    await page.goto('/ja')
    await expect(page).toHaveTitle(/RateIt Her/)
  })

  test('4つのタブが表示される', async ({ page }) => {
    await page.goto('/ja')
    await expect(page.getByRole('tab', { name: '総合' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Cute' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Sexy' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Cool' })).toBeVisible()
  })

  test('タブクリックで URL が変わる', async ({ page }) => {
    await page.goto('/ja')
    await page.getByRole('tab', { name: 'Cute' }).click()
    await expect(page).toHaveURL(/tab=cute/)
  })

  test('ランキングカードをクリックして芸能人ページへ遷移', async ({ page }) => {
    await page.goto('/ja')
    // ランキングにデータがある場合のみテスト
    const cards = page.locator('a[href*="/celebrities/"]')
    const count = await cards.count()
    if (count > 0) {
      await cards.first().click()
      await expect(page).toHaveURL(/\/celebrities\/\d+/)
    }
  })
})
