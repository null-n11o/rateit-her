import { test, expect } from '@playwright/test'
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

let testCelebrityId: number

test.beforeAll(async () => {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT id FROM celebrities WHERE name = 'E2Eテスト女優A' LIMIT 1
  ` as { id: number }[]
  testCelebrityId = rows[0]?.id
})

test.describe('芸能人プロフィールページ', () => {
  test('芸能人プロフィールページにアクセスできる', async ({ page }) => {
    test.skip(!testCelebrityId, 'テストデータなし')
    await page.goto(`/ja/celebrities/${testCelebrityId}`)
    await expect(page.getByText('E2Eテスト女優A')).toBeVisible()
  })

  test('評価フォームが表示される', async ({ page }) => {
    test.skip(!testCelebrityId, 'テストデータなし')
    await page.goto(`/ja/celebrities/${testCelebrityId}`)
    await expect(page.getByRole('button', { name: /Cute/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Sexy/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Cool/i })).toBeVisible()
  })

  test('評価を送信できる', async ({ page }) => {
    test.skip(!testCelebrityId, 'テストデータなし')
    await page.goto(`/ja/celebrities/${testCelebrityId}`)
    await page.getByRole('button', { name: /Cute/i }).click()
    await page.locator('input[type="number"]').fill('4.5')
    await page.getByRole('button', { name: '評価を送信' }).click()
    await expect(page.getByText('評価を更新しました')).toBeVisible({ timeout: 5000 })
  })

  test('存在しない ID で 404 ページが表示される', async ({ page }) => {
    await page.goto('/ja/celebrities/99999999')
    await expect(page.getByText(/見つかりません/)).toBeVisible()
  })
})
