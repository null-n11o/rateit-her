import { test, expect } from '@playwright/test'

test.describe('芸能人一覧ページ', () => {
  test('ページにアクセスできる', async ({ page }) => {
    await page.goto('/ja/celebrities')
    await expect(page.getByRole('heading', { name: '芸能人一覧' })).toBeVisible()
  })

  test('検索フォームが表示される', async ({ page }) => {
    await page.goto('/ja/celebrities')
    await expect(page.getByPlaceholder('名前で検索...')).toBeVisible()
  })

  test('検索クエリが URL に反映される', async ({ page }) => {
    await page.goto('/ja/celebrities')
    await page.getByPlaceholder('名前で検索...').fill('テスト')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=%E3%83%86%E3%82%B9%E3%83%88/)
  })

  test('検索で "E2Eテスト女優A" がヒットする', async ({ page }) => {
    await page.goto('/ja/celebrities?q=E2Eテスト')
    await expect(page.getByText('E2Eテスト女優A')).toBeVisible()
  })

  test('存在しない名前で検索すると "見つかりません" が表示される', async ({ page }) => {
    await page.goto('/ja/celebrities?q=zzz存在しない名前zzz')
    await expect(page.getByText('該当する芸能人が見つかりません')).toBeVisible()
  })
})
