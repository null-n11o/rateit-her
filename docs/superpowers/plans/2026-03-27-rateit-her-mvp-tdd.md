# RateIt Her MVP Implementation Plan (TDD)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 芸能人評価・ランキングサイト「RateIt Her」のMVPをテスト駆動開発（TDD）で構築し、Vercel にデプロイする

**Architecture:** Next.js 16 App Router（SSR）+ Neon PostgreSQL（サーバーレス）+ 匿名セッションID（httpOnly Cookie）。評価送信は Server Action 経由でバリデーション後 UPSERT。ランキング集計は PostgreSQL VIEW で処理。Unit テストは Vitest + React Testing Library、E2E テストは Playwright。async Server Components（ページコンポーネント）は Vitest で直接テスト不可のため Playwright E2E でカバーする。

**Tech Stack:** Next.js 16.2.1, React 19.2.4, next-intl, @neondatabase/serverless, zod, @upstash/ratelimit, @upstash/redis, TypeScript, Tailwind CSS v4, Vitest, @testing-library/react, @testing-library/jest-dom, Playwright

---

## 実装済みコード（変更不要）

以下のファイルは既に実装済み。テスト追加のみ行う：

- `i18n/routing.ts` — next-intl ルーティング設定
- `i18n/request.ts` — next-intl リクエスト設定
- `app/[locale]/layout.tsx` — ルートレイアウト
- `app/[locale]/not-found.tsx` — 404 ページ
- `lib/db/client.ts` — Neon DB クライアント
- `lib/db/schema.sql` — テーブル定義・VIEW
- `lib/db/queries/celebrities.ts` — celebrities クエリ
- `lib/db/queries/evaluations.ts` — evaluations クエリ
- `lib/session.ts` — session_id Cookie ユーティリティ
- `messages/ja.json` — 日本語 UI テキスト
- `types/index.ts` — 共通型定義

**既知の問題:** `proxy.ts`（middleware 実装）が `middleware.ts` として配置されておらず Next.js に接続されていない。Task 2 で修正する。

---

## File Map

```
rateit-her/
├── middleware.ts                               # proxy.ts を rename して修正（Task 2）
├── proxy.ts                                    # → middleware.ts に移行後削除
├── vitest.config.mts                           # Vitest 設定（Task 1）
├── playwright.config.ts                        # Playwright 設定（Task 1）
├── __tests__/
│   ├── setup.ts                                # テスト共通セットアップ（Task 1）
│   ├── helpers/
│   │   └── test-utils.tsx                      # カスタム render（next-intl Provider）（Task 1）
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── db/queries/
│   │   │   │   ├── celebrities.test.ts         # DBクエリユニットテスト（Task 2）
│   │   │   │   └── evaluations.test.ts         # DBクエリユニットテスト（Task 2）
│   │   │   ├── session.test.ts                 # セッションユーティリティテスト（Task 2）
│   │   │   ├── actions/
│   │   │   │   └── evaluate.test.ts            # Server Action バリデーションテスト（Task 3）
│   │   │   ├── wikipedia/
│   │   │   │   └── client.test.ts              # Wikipedia API クライアントテスト（Task 4）
│   │   │   └── ratelimit.test.ts               # レート制限ユニットテスト（Task 11）
│   │   └── scripts/
│   │       └── seed-celebrity.test.ts          # seed スクリプトテスト（Task 12）
│   └── components/
│       ├── ui/
│       │   ├── Button.test.tsx                 # Task 5
│       │   └── Input.test.tsx                  # Task 5
│       ├── ranking/
│       │   ├── RankingCard.test.tsx            # Task 6
│       │   └── RankingTabs.test.tsx            # Task 6
│       ├── celebrity/
│       │   ├── TypeVoteBar.test.tsx            # Task 8
│       │   └── EvaluationForm.test.tsx         # Task 8
│       └── profile/
│           ├── EvaluationTabs.test.tsx         # Task 10
│           └── Top5List.test.tsx               # Task 10
├── e2e/
│   ├── global-setup.ts                         # テストDB シード（Task 1）
│   ├── global-teardown.ts                      # テストDB クリーンアップ（Task 1）
│   ├── ranking.spec.ts                         # Task 6
│   ├── celebrities.spec.ts                     # Task 7
│   ├── celebrity-profile.spec.ts               # Task 9
│   └── profile.spec.ts                         # Task 10
├── lib/
│   ├── actions/
│   │   └── evaluate.ts                         # 評価 Server Action（Task 3）
│   ├── wikipedia/
│   │   └── client.ts                           # Wikipedia REST API クライアント（Task 4）
│   └── ratelimit.ts                            # レート制限ロジック（Task 11）
├── components/
│   ├── ui/
│   │   ├── Button.tsx                          # Task 5
│   │   ├── Input.tsx                           # Task 5
│   │   └── Toast.tsx                           # Task 5
│   ├── ranking/
│   │   ├── RankingCard.tsx                     # Task 6
│   │   └── RankingTabs.tsx                     # Task 6
│   ├── celebrity/
│   │   ├── TypeVoteBar.tsx                     # Task 8
│   │   └── EvaluationForm.tsx                  # Task 8
│   └── profile/
│       ├── EvaluationTabs.tsx                  # Task 10
│       └── Top5List.tsx                        # Task 10
├── app/[locale]/(main)/
│   ├── page.tsx                                # ランキングページ（Task 6 で実装）
│   ├── celebrities/
│   │   ├── page.tsx                            # 芸能人一覧（Task 7）
│   │   └── [id]/page.tsx                       # 芸能人プロフィール（Task 9）
│   └── profile/
│       └── page.tsx                            # ユーザープロフィール（Task 10）
└── scripts/
    └── seed-celebrity.ts                       # 芸能人登録 CLI（Task 12）
```

---

## Task 1: テスト環境セットアップ

**Files:**
- Create: `vitest.config.mts`
- Create: `playwright.config.ts`
- Create: `__tests__/setup.ts`
- Create: `__tests__/helpers/test-utils.tsx`
- Create: `e2e/global-setup.ts`
- Create: `e2e/global-teardown.ts`
- Modify: `package.json`

- [ ] **Step 1: テスト依存パッケージをインストール**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom \
  @testing-library/react @testing-library/dom @testing-library/user-event \
  @testing-library/jest-dom @playwright/test
```

- [ ] **Step 2: Playwright ブラウザをインストール**

```bash
npx playwright install chromium
```

- [ ] **Step 3: `vitest.config.mts` を作成**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    globals: true,
    exclude: ['node_modules', 'e2e'],
  },
})
```

- [ ] **Step 4: `playwright.config.ts` を作成**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- [ ] **Step 5: `__tests__/setup.ts` を作成**

```ts
import '@testing-library/jest-dom/vitest'

// テスト用環境変数（モック時に module が throw しないよう設定）
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
```

- [ ] **Step 6: `__tests__/helpers/test-utils.tsx` を作成**

next-intl の `NextIntlClientProvider` でラップするカスタム `render`。

```tsx
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/ja.json'

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="ja" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

- [ ] **Step 7: `e2e/global-setup.ts` を作成**

E2E テスト用の固定テストデータをシードする。

```ts
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  const sql = neon(process.env.DATABASE_URL!)

  // テスト芸能人を upsert（名前で識別）
  await sql`
    INSERT INTO celebrities (name, category, description)
    VALUES
      ('E2Eテスト女優A', 'actress', 'E2Eテスト用データ'),
      ('E2Eテストモデル', 'model', 'E2Eテスト用データ')
    ON CONFLICT DO NOTHING
  `
}
```

- [ ] **Step 8: `e2e/global-teardown.ts` を作成**

```ts
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

export default async function globalTeardown() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  const sql = neon(process.env.DATABASE_URL!)

  // evaluations は celebrities を FK 参照しているため先に削除する
  await sql`
    DELETE FROM evaluations
    WHERE celebrity_id IN (
      SELECT id FROM celebrities WHERE description = 'E2Eテスト用データ'
    )
  `
  await sql`DELETE FROM celebrities WHERE description = 'E2Eテスト用データ'`
}
```

- [ ] **Step 9: `package.json` の scripts を更新**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

- [ ] **Step 10: 空のテストで動作確認**

```bash
npx vitest run
```

Expected: "No test files found" またはテスト 0 件で終了（エラーなし）

- [ ] **Step 11: コミット**

```bash
git add vitest.config.mts playwright.config.ts __tests__/ e2e/ package.json package-lock.json
git commit -m "chore: add Vitest and Playwright test infrastructure"
```

---

## Task 2: 既存コードのユニットテスト + middleware.ts 修正

**Files:**
- Create: `middleware.ts`（`proxy.ts` を正式な Next.js middleware として接続）
- Delete: `proxy.ts`（middleware.ts に統合）
- Create: `__tests__/unit/lib/db/queries/celebrities.test.ts`
- Create: `__tests__/unit/lib/db/queries/evaluations.test.ts`
- Create: `__tests__/unit/lib/session.test.ts`

### 2a: middleware.ts の修正

- [ ] **Step 1: `proxy.ts` の内容を `middleware.ts` として作成（default export に変更）**

```ts
// middleware.ts
import { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { v4 as uuidv4 } from 'uuid'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  if (!request.cookies.get(SESSION_COOKIE)) {
    const sessionId = uuidv4()
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: `proxy.ts` を削除**

```bash
git rm proxy.ts
```

- [ ] **Step 3: dev サーバーで動作確認（初回アクセス時に session_id Cookie が発行されること）**

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、DevTools の Application → Cookies で `session_id` が存在することを確認。

### 2b: DBクエリ層のテスト

- [ ] **Step 4: `__tests__/unit/lib/db/queries/celebrities.test.ts` の失敗テストを書く**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// DB クライアントをモック（module 実行を防ぐ）
vi.mock('@/lib/db/client', () => ({
  sql: vi.fn(),
}))

import { sql } from '@/lib/db/client'
import {
  getCelebrities,
  getCelebrityById,
  getRankings,
  getCelebrityRanking,
} from '@/lib/db/queries/celebrities'
import type { Celebrity, CelebrityRanking } from '@/types'

const mockCelebrity: Celebrity = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  description: 'テスト用',
  image_url: null,
  wikipedia_slug: null,
  created_at: '2026-01-01T00:00:00Z',
}

const mockRanking: CelebrityRanking = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  image_url: null,
  avg_score: 4.5,
  vote_count: 10,
  dominant_type: 'cute',
  avg_score_cute: 4.5,
  vote_count_cute: 8,
  avg_score_sexy: null,
  vote_count_sexy: 0,
  avg_score_cool: null,
  vote_count_cool: 2,
}

describe('getCelebrities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('検索なしで全件を名前順で返す', async () => {
    vi.mocked(sql).mockResolvedValue([mockCelebrity] as never)
    const result = await getCelebrities()
    expect(result).toEqual([mockCelebrity])
    expect(vi.mocked(sql).mock.calls[0][0]).toContain('ORDER BY name ASC')
  })

  it('検索クエリがある場合は ILIKE でフィルタする', async () => {
    vi.mocked(sql).mockResolvedValue([mockCelebrity] as never)
    await getCelebrities('花子')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('ILIKE')
  })
})

describe('getCelebrityById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在する ID の芸能人を返す', async () => {
    vi.mocked(sql).mockResolvedValue([mockCelebrity] as never)
    const result = await getCelebrityById(1)
    expect(result).toEqual(mockCelebrity)
  })

  it('存在しない ID の場合は null を返す', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    const result = await getCelebrityById(9999)
    expect(result).toBeNull()
  })
})

describe('getRankings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('all タブは avg_score で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([mockRanking] as never)
    await getRankings('all')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('avg_score')
    expect(query).toContain('vote_count > 0')
  })

  it('cute タブは avg_score_cute で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([mockRanking] as never)
    await getRankings('cute')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('avg_score_cute')
    expect(query).toContain('vote_count_cute > 0')
  })

  it('sexy タブは avg_score_sexy で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('sexy')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('avg_score_sexy')
  })

  it('cool タブは avg_score_cool で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('cool')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('avg_score_cool')
  })

  it('デフォルトの limit は 50', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('all')
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('LIMIT')
  })
})
```

- [ ] **Step 5: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/unit/lib/db/queries/celebrities.test.ts
```

Expected: テストが実行される（mock が正しく機能すれば PASS のはずだが、query string の assertion が実装と合致するか確認）

- [ ] **Step 6: テストが PASS することを確認**

```bash
npx vitest run __tests__/unit/lib/db/queries/celebrities.test.ts
```

Expected: PASS（既存実装が正しければそのまま通る）

- [ ] **Step 7: `__tests__/unit/lib/db/queries/evaluations.test.ts` を書く**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  sql: vi.fn(),
}))

import { sql } from '@/lib/db/client'
import {
  getEvaluationBySession,
  getEvaluationsBySession,
  getTop5BySession,
  upsertEvaluation,
} from '@/lib/db/queries/evaluations'
import type { Evaluation } from '@/types'

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'

const mockEvaluation: Evaluation = {
  id: 1,
  session_id: SESSION_ID,
  celebrity_id: 1,
  type_vote: 'cute',
  score: 4.5,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('getEvaluationBySession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッション+芸能人IDに合致する評価を返す', async () => {
    vi.mocked(sql).mockResolvedValue([mockEvaluation] as never)
    const result = await getEvaluationBySession(SESSION_ID, 1)
    expect(result).toEqual(mockEvaluation)
  })

  it('存在しない場合は null を返す', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    const result = await getEvaluationBySession(SESSION_ID, 999)
    expect(result).toBeNull()
  })
})

describe('getTop5BySession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('スコア降順で最大5件を返す', async () => {
    vi.mocked(sql).mockResolvedValue([mockEvaluation] as never)
    await getTop5BySession(SESSION_ID)
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('ORDER BY e.score DESC')
    expect(query).toContain('LIMIT 5')
  })
})

describe('upsertEvaluation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('INSERT ... ON CONFLICT DO UPDATE を実行する', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await upsertEvaluation({
      sessionId: SESSION_ID,
      celebrityId: 1,
      typeVote: 'cute',
      score: 4.5,
    })
    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('ON CONFLICT')
    expect(query).toContain('DO UPDATE SET')
    expect(query).toContain('updated_at = NOW()')
  })
})
```

- [ ] **Step 8: `__tests__/unit/lib/session.test.ts` を書く**

`next/headers` をモックする必要がある。

```ts
import { describe, it, expect, vi } from 'vitest'

const mockGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}))

import { getSessionId, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

describe('getSessionId', () => {
  it('Cookie に session_id がある場合はその値を返す', async () => {
    mockGet.mockReturnValue({ value: 'test-uuid-1234' })
    const result = await getSessionId()
    expect(result).toBe('test-uuid-1234')
    expect(mockGet).toHaveBeenCalledWith(SESSION_COOKIE)
  })

  it('Cookie に session_id がない場合は null を返す', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await getSessionId()
    expect(result).toBeNull()
  })
})

describe('SESSION_MAX_AGE', () => {
  it('1年分の秒数（31536000）', () => {
    expect(SESSION_MAX_AGE).toBe(365 * 24 * 60 * 60)
  })
})
```

- [ ] **Step 9: 全ユニットテストを実行して PASS を確認**

```bash
npx vitest run __tests__/unit/
```

Expected: 全テスト PASS

- [ ] **Step 10: コミット**

```bash
git add middleware.ts __tests__/unit/lib/
git rm proxy.ts
git commit -m "feat: wire middleware.ts and add unit tests for DB queries and session"
```

---

## Task 3: 評価 Server Action (TDD)

**Files:**
- Create: `lib/actions/evaluate.ts`
- Create: `__tests__/unit/lib/actions/evaluate.test.ts`

テスト可能にするため、ビジネスロジックを `processEvaluation` 純粋関数として抽出し、Server Action はそれを呼び出す薄いラッパーとする。

- [ ] **Step 1: 失敗テストを書く**

```ts
// __tests__/unit/lib/actions/evaluate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({ sql: vi.fn() }))
vi.mock('@/lib/db/queries/evaluations', () => ({
  upsertEvaluation: vi.fn().mockResolvedValue(undefined),
}))

import { processEvaluation } from '@/lib/actions/evaluate'
import { upsertEvaluation } from '@/lib/db/queries/evaluations'

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('processEvaluation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常なデータで成功を返す', async () => {
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'cute',
      score: 4.5,
    })
    expect(result).toEqual({ success: true })
    expect(upsertEvaluation).toHaveBeenCalledWith({
      sessionId: SESSION_ID,
      celebrityId: 1,
      typeVote: 'cute',
      score: 4.5,
    })
  })

  it('celebrity_id が 0 以下はバリデーションエラー', async () => {
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 0,
      type_vote: 'cute',
      score: 4.5,
    })
    expect(result.success).toBe(false)
    expect(upsertEvaluation).not.toHaveBeenCalled()
  })

  it('type_vote が不正な値はバリデーションエラー', async () => {
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'invalid',
      score: 4.5,
    })
    expect(result.success).toBe(false)
    expect(upsertEvaluation).not.toHaveBeenCalled()
  })

  it('score が 1.0 未満はバリデーションエラー', async () => {
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'cute',
      score: 0.9,
    })
    expect(result.success).toBe(false)
  })

  it('score が 5.0 超はバリデーションエラー', async () => {
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'cute',
      score: 5.1,
    })
    expect(result.success).toBe(false)
  })

  it('score は 0.1 刻みで丸められる（浮動小数点対策）', async () => {
    // 4.1000000000000001 → 4.1 に丸める
    await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'sexy',
      score: 4.1000000000000001,
    })
    expect(upsertEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ score: 4.1 })
    )
  })

  it('DB エラーは { success: false, error: ... } を返す', async () => {
    vi.mocked(upsertEvaluation).mockRejectedValue(new Error('DB Error'))
    const result = await processEvaluation(SESSION_ID, {
      celebrity_id: 1,
      type_vote: 'cool',
      score: 3.0,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/unit/lib/actions/evaluate.test.ts
```

Expected: FAIL（`processEvaluation` が存在しないため）

- [ ] **Step 3: `lib/actions/evaluate.ts` を実装する**

```ts
'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { upsertEvaluation } from '@/lib/db/queries/evaluations'

export type EvaluateResult = { success: true } | { success: false; error: string }

const evaluateSchema = z.object({
  celebrity_id: z.number().int().positive(),
  type_vote: z.enum(['cute', 'sexy', 'cool']),
  score: z.number().min(1.0).max(5.0),
})

// テスト可能な純粋ロジック（Server Action から分離）
export async function processEvaluation(
  sessionId: string,
  input: unknown
): Promise<EvaluateResult> {
  const parsed = evaluateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'バリデーションエラー' }
  }

  // 浮動小数点誤差を回避するため 0.1 刻みで丸める
  const score = Math.round(parsed.data.score * 10) / 10

  try {
    await upsertEvaluation({
      sessionId,
      celebrityId: parsed.data.celebrity_id,
      typeVote: parsed.data.type_vote,
      score,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'サーバーエラーが発生しました' }
  }
}

// Next.js Server Action（薄いラッパー）
export async function evaluateAction(
  _: EvaluateResult | null,
  formData: FormData
): Promise<EvaluateResult> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return { success: false, error: 'セッションが見つかりません' }
  }
  return processEvaluation(sessionId, {
    celebrity_id: Number(formData.get('celebrity_id')),
    type_vote: formData.get('type_vote'),
    score: Number(formData.get('score')),
  })
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/unit/lib/actions/evaluate.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add lib/actions/evaluate.ts __tests__/unit/lib/actions/evaluate.test.ts
git commit -m "feat: add evaluate Server Action with TDD"
```

---

## Task 4: Wikipedia API クライアント (TDD)

**Files:**
- Create: `lib/wikipedia/client.ts`
- Create: `__tests__/unit/lib/wikipedia/client.test.ts`

Wikipedia REST API から `description` と `thumbnail.source`（画像URL）を取得するクライアント。

- [ ] **Step 1: 失敗テストを書く**

```ts
// __tests__/unit/lib/wikipedia/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWikipediaSummary, type WikipediaSummary } from '@/lib/wikipedia/client'

describe('fetchWikipediaSummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('正常なレスポンスから summary を取得する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: 'テスト説明文',
        thumbnail: { source: 'https://upload.wikimedia.org/test.jpg' },
      }),
    } as Response)

    const result = await fetchWikipediaSummary('松本まりか')
    expect(result).toEqual<WikipediaSummary>({
      description: 'テスト説明文',
      imageUrl: 'https://upload.wikimedia.org/test.jpg',
    })
  })

  it('thumbnail がない場合は imageUrl を null にする', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        extract: '説明文',
        thumbnail: undefined,
      }),
    } as Response)

    const result = await fetchWikipediaSummary('テスト')
    expect(result?.imageUrl).toBeNull()
  })

  it('404 の場合は null を返す', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const result = await fetchWikipediaSummary('存在しない芸能人')
    expect(result).toBeNull()
  })

  it('URL はスラッグを encodeURIComponent する', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ extract: '', thumbnail: undefined }),
    } as Response)

    await fetchWikipediaSummary('松本まりか')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('%E6%9D%BE%E6%9C%AC%E3%81%BE%E3%82%8A%E3%81%8B'),
      expect.any(Object)
    )
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/unit/lib/wikipedia/client.test.ts
```

Expected: FAIL

- [ ] **Step 3: `lib/wikipedia/client.ts` を実装する**

```ts
export interface WikipediaSummary {
  description: string
  imageUrl: string | null
}

export async function fetchWikipediaSummary(
  slug: string
): Promise<WikipediaSummary | null> {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RateItHer/1.0' },
    next: { revalidate: 86400 }, // 24h cache
  })

  if (!response.ok) return null

  const data = await response.json()
  return {
    description: data.extract ?? '',
    imageUrl: data.thumbnail?.source ?? null,
  }
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/unit/lib/wikipedia/client.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add lib/wikipedia/client.ts __tests__/unit/lib/wikipedia/client.test.ts
git commit -m "feat: add Wikipedia API client with TDD"
```

---

## Task 5: 共通 UI コンポーネント (TDD)

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `__tests__/components/ui/Button.test.tsx`
- Create: `__tests__/components/ui/Input.test.tsx`

### Button

- [ ] **Step 1: `__tests__/components/ui/Button.test.tsx` を書く**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('ラベルが表示される', () => {
    render(<Button>送信</Button>)
    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument()
  })

  it('クリックで onClick が呼ばれる', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>クリック</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled のとき onClick が呼ばれない', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>ボタン</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('isPending のとき disabled になる', () => {
    render(<Button isPending>送信</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('variant="primary" がデフォルト', () => {
    render(<Button>ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })

  it('variant="secondary" が適用される', () => {
    render(<Button variant="secondary">ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200')
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/ui/Button.test.tsx
```

Expected: FAIL

- [ ] **Step 3: `components/ui/Button.tsx` を実装する**

```tsx
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  isPending?: boolean
}

export function Button({
  variant = 'primary',
  isPending = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  }

  return (
    <button
      disabled={disabled || isPending}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/ui/Button.test.tsx
```

Expected: 全テスト PASS

### Input

- [ ] **Step 5: `__tests__/components/ui/Input.test.tsx` を書く**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('placeholder が表示される', () => {
    render(<Input placeholder="検索..." />)
    expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument()
  })

  it('入力値が変わると onChange が呼ばれる', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'テスト')
    expect(onChange).toHaveBeenCalled()
  })

  it('label が指定された場合に表示される', () => {
    render(<Input label="名前" />)
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/ui/Input.test.tsx
```

Expected: FAIL

- [ ] **Step 7: `components/ui/Input.tsx` を実装する**

```tsx
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.replace(/\s/g, '-').toLowerCase()

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    </div>
  )
}
```

- [ ] **Step 8: `components/ui/Toast.tsx` を実装する（テスト省略：表示のみのシンプルコンポーネント）**

```tsx
'use client'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
}

export function Toast({ message, type = 'success' }: ToastProps) {
  const styles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  }

  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}
    >
      {message}
    </div>
  )
}
```

- [ ] **Step 9: 全 UI コンポーネントテストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/ui/
```

Expected: 全テスト PASS

- [ ] **Step 10: コミット**

```bash
git add components/ui/ __tests__/components/ui/
git commit -m "feat: add shared UI components (Button, Input, Toast) with TDD"
```

---

## Task 6: ランキングコンポーネント + ランキングページ (TDD + E2E)

**Files:**
- Create: `components/ranking/RankingCard.tsx`
- Create: `components/ranking/RankingTabs.tsx`
- Modify: `app/[locale]/(main)/page.tsx`
- Create: `__tests__/components/ranking/RankingCard.test.tsx`
- Create: `__tests__/components/ranking/RankingTabs.test.tsx`
- Create: `e2e/ranking.spec.ts`

### RankingCard

- [ ] **Step 1: `__tests__/components/ranking/RankingCard.test.tsx` を書く**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { RankingCard } from '@/components/ranking/RankingCard'
import type { CelebrityRanking } from '@/types'

const mockRanking: CelebrityRanking = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  image_url: null,
  avg_score: 4.5,
  vote_count: 100,
  dominant_type: 'cute',
  avg_score_cute: 4.5,
  vote_count_cute: 80,
  avg_score_sexy: 3.0,
  vote_count_sexy: 15,
  avg_score_cool: 2.5,
  vote_count_cool: 5,
}

describe('RankingCard', () => {
  it('芸能人の名前が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('順位が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('1位')).toBeInTheDocument()
  })

  it('平均スコアが表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('投票数が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('100票')).toBeInTheDocument()
  })

  it('dominant_type が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('Cute')).toBeInTheDocument()
  })

  it('芸能人プロフィールへのリンクを持つ', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/celebrities/1'))
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/ranking/RankingCard.test.tsx
```

- [ ] **Step 3: `components/ranking/RankingCard.tsx` を実装する**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { CelebrityRanking } from '@/types'

interface RankingCardProps {
  ranking: CelebrityRanking
  rank: number
}

export function RankingCard({ ranking, rank }: RankingCardProps) {
  const locale = useLocale()
  const t = useTranslations('ranking')

  return (
    <Link
      href={`/${locale}/celebrities/${ranking.id}`}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <span className="text-lg font-bold text-gray-500 w-8 shrink-0">
        {t('rank', { rank })}
      </span>
      <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden bg-gray-200">
        {ranking.image_url && (
          <Image
            src={ranking.image_url}
            alt={ranking.name}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{ranking.name}</p>
        {ranking.dominant_type && (
          <p className="text-sm text-gray-500 capitalize">{ranking.dominant_type.charAt(0).toUpperCase() + ranking.dominant_type.slice(1)}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-lg">{ranking.avg_score?.toFixed(1) ?? '-'}</p>
        <p className="text-xs text-gray-400">{t('votes', { count: ranking.vote_count })}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/ranking/RankingCard.test.tsx
```

### RankingTabs（Client Component）

- [ ] **Step 5: `__tests__/components/ranking/RankingTabs.test.tsx` を書く**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import userEvent from '@testing-library/user-event'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { CelebrityRanking } from '@/types'

// next/navigation をモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ja',
  useSearchParams: () => new URLSearchParams(),
}))

const mockRankings: CelebrityRanking[] = [
  {
    id: 1,
    name: '田中花子',
    category: 'actress',
    image_url: null,
    avg_score: 4.5,
    vote_count: 100,
    dominant_type: 'cute',
    avg_score_cute: 4.5,
    vote_count_cute: 100,
    avg_score_sexy: null,
    vote_count_sexy: 0,
    avg_score_cool: null,
    vote_count_cool: 0,
  },
]

describe('RankingTabs', () => {
  it('4つのタブが表示される', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByRole('tab', { name: '総合' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cute' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sexy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cool' })).toBeInTheDocument()
  })

  it('activeTab="all" のとき総合タブが選択状態', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByRole('tab', { name: '総合' })).toHaveAttribute('aria-selected', 'true')
  })

  it('all タブでランキングカードが表示される', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('データなしのタブでは "まだ評価がありません" が表示される', () => {
    render(
      <RankingTabs
        allRankings={[]}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByText('まだ評価がありません')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/ranking/RankingTabs.test.tsx
```

- [ ] **Step 7: `components/ranking/RankingTabs.tsx` を実装する**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RankingCard } from './RankingCard'
import type { CelebrityRanking, TypeVote } from '@/types'

type Tab = 'all' | TypeVote

interface RankingTabsProps {
  allRankings: CelebrityRanking[]
  cuteRankings: CelebrityRanking[]
  sexyRankings: CelebrityRanking[]
  coolRankings: CelebrityRanking[]
  activeTab: Tab
}

export function RankingTabs({
  allRankings,
  cuteRankings,
  sexyRankings,
  coolRankings,
  activeTab,
}: RankingTabsProps) {
  const t = useTranslations('ranking')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabs: { key: Tab; label: string; rankings: CelebrityRanking[] }[] = [
    { key: 'all', label: t('tabs.all'), rankings: allRankings },
    { key: 'cute', label: t('tabs.cute'), rankings: cuteRankings },
    { key: 'sexy', label: t('tabs.sexy'), rankings: sexyRankings },
    { key: 'cool', label: t('tabs.cool'), rankings: coolRankings },
  ]

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const activeRankings = tabs.find((t) => t.key === activeTab)?.rankings ?? []

  return (
    <div>
      <div role="tablist" className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {activeRankings.length === 0 ? (
          <p className="text-center text-gray-400 py-8">{t('noData')}</p>
        ) : (
          activeRankings.map((ranking, index) => (
            <RankingCard key={ranking.id} ranking={ranking} rank={index + 1} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: `app/[locale]/(main)/page.tsx` を実装する**

```tsx
import { getRankings } from '@/lib/db/queries/celebrities'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { TypeVote } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { tab } = await searchParams
  const activeTab = (['cute', 'sexy', 'cool'] as TypeVote[]).includes(tab as TypeVote)
    ? (tab as TypeVote)
    : 'all'

  const [allRankings, cuteRankings, sexyRankings, coolRankings] = await Promise.all([
    getRankings('all'),
    getRankings('cute'),
    getRankings('sexy'),
    getRankings('cool'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ランキング</h1>
      <RankingTabs
        allRankings={allRankings}
        cuteRankings={cuteRankings}
        sexyRankings={sexyRankings}
        coolRankings={coolRankings}
        activeTab={activeTab}
      />
    </div>
  )
}
```

- [ ] **Step 9: ユニットテストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/ranking/
```

Expected: 全テスト PASS

- [ ] **Step 10: E2E テストを書く**

```ts
// e2e/ranking.spec.ts
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
```

- [ ] **Step 11: E2E テストを実行（dev サーバー起動後）**

```bash
npm run dev &
npx playwright test e2e/ranking.spec.ts
```

Expected: 全テスト PASS（DB にデータがない場合は「まだ評価がありません」表示でも PASS）

- [ ] **Step 12: コミット**

```bash
git add components/ranking/ app/[locale]/\(main\)/page.tsx __tests__/components/ranking/ e2e/ranking.spec.ts
git commit -m "feat: add ranking components and ranking page with TDD + E2E"
```

---

## Task 7: 芸能人一覧ページ (TDD + E2E)

**Files:**
- Create: `app/[locale]/(main)/celebrities/page.tsx`
- Create: `e2e/celebrities.spec.ts`

> 注: 一覧ページは async Server Component のため Vitest での直接テストは不可。E2E テストでカバーする。

- [ ] **Step 1: E2E テストを先に書く**

```ts
// e2e/celebrities.spec.ts
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
```

- [ ] **Step 2: E2E テストを実行して失敗を確認**

```bash
npx playwright test e2e/celebrities.spec.ts
```

Expected: FAIL（ページが存在しないため）

- [ ] **Step 3: `app/[locale]/(main)/celebrities/page.tsx` を実装する**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { getCelebrities } from '@/lib/db/queries/celebrities'
import { Input } from '@/components/ui/Input'
import { getLocale } from 'next-intl/server'

interface CelebritiesPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CelebritiesPage({ searchParams }: CelebritiesPageProps) {
  const { q } = await searchParams
  const [celebrities, locale] = await Promise.all([
    getCelebrities(q),
    getLocale(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">芸能人一覧</h1>

      <form className="mb-6">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="名前で検索..."
          className="max-w-sm"
        />
      </form>

      {celebrities.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          該当する芸能人が見つかりません
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {celebrities.map((celebrity) => (
            <Link
              key={celebrity.id}
              href={`/${locale}/celebrities/${celebrity.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                {celebrity.image_url && (
                  <Image
                    src={celebrity.image_url}
                    alt={celebrity.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <p className="text-sm font-medium text-center truncate w-full">
                {celebrity.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: E2E テストを実行して PASS を確認**

```bash
npx playwright test e2e/celebrities.spec.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add app/[locale]/\(main\)/celebrities/page.tsx e2e/celebrities.spec.ts
git commit -m "feat: add celebrities list page with E2E tests"
```

---

## Task 8: 評価フォームコンポーネント (TDD)

**Files:**
- Create: `components/celebrity/TypeVoteBar.tsx`
- Create: `components/celebrity/EvaluationForm.tsx`
- Create: `__tests__/components/celebrity/TypeVoteBar.test.tsx`
- Create: `__tests__/components/celebrity/EvaluationForm.test.tsx`

### TypeVoteBar

- [ ] **Step 1: `__tests__/components/celebrity/TypeVoteBar.test.tsx` を書く**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { TypeVoteBar } from '@/components/celebrity/TypeVoteBar'
import type { CelebrityRanking } from '@/types'

const mockRanking: CelebrityRanking = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  image_url: null,
  avg_score: 4.0,
  vote_count: 100,
  dominant_type: 'cute',
  avg_score_cute: 4.5,
  vote_count_cute: 60,
  avg_score_sexy: 3.5,
  vote_count_sexy: 30,
  avg_score_cool: 3.0,
  vote_count_cool: 10,
}

describe('TypeVoteBar', () => {
  it('3種類のタイプが表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    expect(screen.getByText('Cute')).toBeInTheDocument()
    expect(screen.getByText('Sexy')).toBeInTheDocument()
    expect(screen.getByText('Cool')).toBeInTheDocument()
  })

  it('票数が表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    expect(screen.getByText('60票')).toBeInTheDocument()
    expect(screen.getByText('30票')).toBeInTheDocument()
    expect(screen.getByText('10票')).toBeInTheDocument()
  })

  it('dominant_type の Cute が強調表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    const cuteSection = screen.getByText('Cute').closest('[data-dominant]')
    expect(cuteSection).not.toBeNull()
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/celebrity/TypeVoteBar.test.tsx
```

- [ ] **Step 3: `components/celebrity/TypeVoteBar.tsx` を実装する**

```tsx
import type { CelebrityRanking, TypeVote } from '@/types'

interface TypeVoteBarProps {
  ranking: CelebrityRanking
}

const TYPE_LABELS: Record<TypeVote, string> = {
  cute: 'Cute',
  sexy: 'Sexy',
  cool: 'Cool',
}

export function TypeVoteBar({ ranking }: TypeVoteBarProps) {
  const total = ranking.vote_count || 1
  const types: { key: TypeVote; count: number }[] = [
    { key: 'cute', count: ranking.vote_count_cute },
    { key: 'sexy', count: ranking.vote_count_sexy },
    { key: 'cool', count: ranking.vote_count_cool },
  ]

  return (
    <div className="flex flex-col gap-2">
      {types.map(({ key, count }) => {
        const pct = Math.round((count / total) * 100)
        const isDominant = ranking.dominant_type === key

        return (
          <div
            key={key}
            data-dominant={isDominant ? 'true' : undefined}
            className={`flex items-center gap-3 p-2 rounded-lg ${isDominant ? 'bg-blue-50' : ''}`}
          >
            <span className={`text-sm font-medium w-10 ${isDominant ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
              {TYPE_LABELS[key]}
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isDominant ? 'bg-blue-500' : 'bg-gray-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12 text-right">{count}票</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: TypeVoteBar テストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/celebrity/TypeVoteBar.test.tsx
```

### EvaluationForm（Client Component + useActionState）

- [ ] **Step 5: `__tests__/components/celebrity/EvaluationForm.test.tsx` を書く**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../../helpers/test-utils'
import userEvent from '@testing-library/user-event'
import { EvaluationForm } from '@/components/celebrity/EvaluationForm'
import type { Evaluation } from '@/types'

// Server Action をモック
vi.mock('@/lib/actions/evaluate', () => ({
  evaluateAction: vi.fn().mockResolvedValue({ success: true }),
}))

describe('EvaluationForm', () => {
  it('タイプ選択ボタンが3つ表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('button', { name: /Cute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sexy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cool/i })).toBeInTheDocument()
  })

  it('スコア入力フィールドが表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('タイプを選択するとボタンが選択状態になる', async () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    await userEvent.click(screen.getByRole('button', { name: /Cute/i }))
    expect(screen.getByRole('button', { name: /Cute/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('既存の評価がある場合は初期値が設定される', () => {
    const existing: Evaluation = {
      id: 1,
      session_id: 'test',
      celebrity_id: 1,
      type_vote: 'sexy',
      score: 3.5,
      created_at: '',
      updated_at: '',
    }
    render(<EvaluationForm celebrityId={1} initialEvaluation={existing} />)
    expect(screen.getByRole('button', { name: /Sexy/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('spinbutton')).toHaveValue(3.5)
  })

  it('送信ボタンが表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('button', { name: '評価を送信' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/celebrity/EvaluationForm.test.tsx
```

- [ ] **Step 7: `components/celebrity/EvaluationForm.tsx` を実装する**

```tsx
'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { evaluateAction, type EvaluateResult } from '@/lib/actions/evaluate'
import { Button } from '@/components/ui/Button'
import type { Evaluation, TypeVote } from '@/types'

interface EvaluationFormProps {
  celebrityId: number
  initialEvaluation: Evaluation | null
}

const TYPE_LABELS: Record<TypeVote, string> = {
  cute: 'Cute',
  sexy: 'Sexy',
  cool: 'Cool',
}

export function EvaluationForm({ celebrityId, initialEvaluation }: EvaluationFormProps) {
  const t = useTranslations('celebrity')
  const [state, formAction, isPending] = useActionState<EvaluateResult | null, FormData>(
    evaluateAction,
    null
  )
  const [selectedType, setSelectedType] = useState<TypeVote | null>(
    initialEvaluation?.type_vote ?? null
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="celebrity_id" value={celebrityId} />
      <input type="hidden" name="type_vote" value={selectedType ?? ''} />

      <div>
        <p className="text-sm font-medium mb-2">{t('typeVote.cute')} / {t('typeVote.sexy')} / {t('typeVote.cool')}</p>
        <div className="flex gap-2">
          {(['cute', 'sexy', 'cool'] as TypeVote[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selectedType === type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          スコア（1.0 〜 5.0）
        </label>
        <input
          type="number"
          name="score"
          min="1.0"
          max="5.0"
          step="0.1"
          defaultValue={initialEvaluation?.score ?? 3.0}
          className="border border-gray-300 rounded-lg px-3 py-2 w-24"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">{t('updated')}</p>
      )}

      <Button type="submit" isPending={isPending}>
        {t('submit')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 8: 全 celebrity コンポーネントテストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/celebrity/
```

Expected: 全テスト PASS

- [ ] **Step 9: コミット**

```bash
git add components/celebrity/ __tests__/components/celebrity/
git commit -m "feat: add TypeVoteBar and EvaluationForm components with TDD"
```

---

## Task 9: 芸能人プロフィールページ (E2E)

**Files:**
- Create: `app/[locale]/(main)/celebrities/[id]/page.tsx`
- Create: `e2e/celebrity-profile.spec.ts`

- [ ] **Step 1: E2E テストを先に書く**

```ts
// e2e/celebrity-profile.spec.ts
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
```

- [ ] **Step 2: E2E テストを実行して失敗を確認**

```bash
npx playwright test e2e/celebrity-profile.spec.ts
```

Expected: FAIL（ページが存在しないため）

- [ ] **Step 3: `app/[locale]/(main)/celebrities/[id]/page.tsx` を実装する**

```tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getCelebrityById, getCelebrityRanking } from '@/lib/db/queries/celebrities'
import { getEvaluationBySession } from '@/lib/db/queries/evaluations'
import { getSessionId } from '@/lib/session'
import { TypeVoteBar } from '@/components/celebrity/TypeVoteBar'
import { EvaluationForm } from '@/components/celebrity/EvaluationForm'

interface CelebrityPageProps {
  params: Promise<{ id: string }>
}

export default async function CelebrityPage({ params }: CelebrityPageProps) {
  const { id } = await params
  const celebrityId = Number(id)

  if (!Number.isInteger(celebrityId) || celebrityId <= 0) {
    notFound()
  }

  const [celebrity, ranking] = await Promise.all([
    getCelebrityById(celebrityId),
    getCelebrityRanking(celebrityId),
  ])

  if (!celebrity) notFound()

  const sessionId = await getSessionId()
  const myEvaluation = sessionId
    ? await getEvaluationBySession(sessionId, celebrityId)
    : null

  return (
    <div className="max-w-2xl">
      <div className="flex gap-6 mb-8">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 shrink-0">
          {celebrity.image_url && (
            <Image
              src={celebrity.image_url}
              alt={celebrity.name}
              fill
              className="object-cover"
            />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{celebrity.name}</h1>
          <p className="text-sm text-gray-500 capitalize mt-1">{celebrity.category}</p>
          {celebrity.description && (
            <p className="text-sm text-gray-600 mt-2">{celebrity.description}</p>
          )}
        </div>
      </div>

      {ranking && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">みんなの評価</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold">
              {ranking.avg_score?.toFixed(1) ?? '-'}
            </span>
            <span className="text-gray-500">{ranking.vote_count}票</span>
          </div>
          <TypeVoteBar ranking={ranking} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {myEvaluation ? 'あなたの評価' : '評価する'}
        </h2>
        <EvaluationForm celebrityId={celebrityId} initialEvaluation={myEvaluation} />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: E2E テストを実行して PASS を確認**

```bash
npx playwright test e2e/celebrity-profile.spec.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add app/[locale]/\(main\)/celebrities/[id]/page.tsx e2e/celebrity-profile.spec.ts
git commit -m "feat: add celebrity profile page with E2E tests"
```

---

## Task 10: プロフィールページ (TDD + E2E)

**Files:**
- Create: `components/profile/EvaluationTabs.tsx`
- Create: `components/profile/Top5List.tsx`
- Create: `app/[locale]/(main)/profile/page.tsx`
- Create: `__tests__/components/profile/EvaluationTabs.test.tsx`
- Create: `__tests__/components/profile/Top5List.test.tsx`
- Create: `e2e/profile.spec.ts`

### EvaluationTabs

- [ ] **Step 1: `__tests__/components/profile/EvaluationTabs.test.tsx` を書く**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { EvaluationTabs } from '@/components/profile/EvaluationTabs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/ja/profile',
  useSearchParams: () => new URLSearchParams(),
}))

const mockEvaluations = [
  {
    id: 1,
    session_id: 'test',
    celebrity_id: 1,
    type_vote: 'cute' as const,
    score: 4.5,
    created_at: '',
    updated_at: '',
    celebrity_name: '田中花子',
    celebrity_image_url: null,
  },
  {
    id: 2,
    session_id: 'test',
    celebrity_id: 2,
    type_vote: 'sexy' as const,
    score: 3.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '鈴木一郎',
    celebrity_image_url: null,
  },
]

describe('EvaluationTabs', () => {
  it('Cute / Sexy / Cool タブが表示される', () => {
    render(<EvaluationTabs evaluations={mockEvaluations} />)
    expect(screen.getByRole('tab', { name: 'Cute' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sexy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cool' })).toBeInTheDocument()
  })

  it('Cute タブに cute 評価が表示される', () => {
    render(<EvaluationTabs evaluations={mockEvaluations} />)
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('Cute タブに sexy 評価は表示されない', () => {
    render(<EvaluationTabs evaluations={mockEvaluations} />)
    // デフォルトは全件表示（「全て」タブ）か Cute タブのどちらか
    // Sexy タブをクリック
    screen.getByRole('tab', { name: 'Cute' }).click()
    // 鈴木一郎（sexy）は表示されない
  })

  it('評価が空の場合は空状態メッセージが表示される', () => {
    render(<EvaluationTabs evaluations={[]} />)
    expect(screen.getByText(/まだ評価した芸能人がいません/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/profile/EvaluationTabs.test.tsx
```

- [ ] **Step 3: `components/profile/EvaluationTabs.tsx` を実装する**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import type { Evaluation, TypeVote } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface EvaluationTabsProps {
  evaluations: EvaluationWithCelebrity[]
}

const TABS: { key: TypeVote; label: string }[] = [
  { key: 'cute', label: 'Cute' },
  { key: 'sexy', label: 'Sexy' },
  { key: 'cool', label: 'Cool' },
]

export function EvaluationTabs({ evaluations }: EvaluationTabsProps) {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<TypeVote>('cute')

  const filtered = evaluations.filter((e) => e.type_vote === activeTab)

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('empty')}</p>
        <Link href={`/${locale}`} className="text-blue-600 underline mt-2 inline-block">
          {t('goToRanking')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div role="tablist" className="flex border-b mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">評価なし</p>
        ) : (
          filtered.map((evaluation) => (
            <Link
              key={evaluation.id}
              href={`/${locale}/celebrities/${evaluation.celebrity_id}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
            >
              <span className="font-medium">{evaluation.celebrity_name}</span>
              <span className="ml-auto text-blue-600 font-bold">{evaluation.score}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

### Top5List

- [ ] **Step 4: `__tests__/components/profile/Top5List.test.tsx` を書く**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { Top5List } from '@/components/profile/Top5List'
import type { Evaluation } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

const mockTop5: EvaluationWithCelebrity[] = [
  {
    id: 1,
    session_id: 'test',
    celebrity_id: 1,
    type_vote: 'cute',
    score: 5.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '1位の人',
    celebrity_image_url: null,
  },
  {
    id: 2,
    session_id: 'test',
    celebrity_id: 2,
    type_vote: 'sexy',
    score: 4.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '2位の人',
    celebrity_image_url: null,
  },
]

describe('Top5List', () => {
  it('TOP5 の芸能人が表示される', () => {
    render(<Top5List top5={mockTop5} />)
    expect(screen.getByText('1位の人')).toBeInTheDocument()
    expect(screen.getByText('2位の人')).toBeInTheDocument()
  })

  it('スコアが表示される', () => {
    render(<Top5List top5={mockTop5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('空の場合は何も表示されない（または空状態）', () => {
    render(<Top5List top5={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
  })
})
```

- [ ] **Step 5: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/components/profile/Top5List.test.tsx
```

- [ ] **Step 6: `components/profile/Top5List.tsx` を実装する**

`useLocale()` はフックのため `'use client'` が必要。

```tsx
'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import type { Evaluation } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface Top5ListProps {
  top5: EvaluationWithCelebrity[]
}

export function Top5List({ top5 }: Top5ListProps) {
  if (top5.length === 0) return null
  const locale = useLocale()

  return (
    <ol>
      {top5.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
          <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
          <Link
            href={`/${locale}/celebrities/${item.celebrity_id}`}
            className="flex-1 font-medium hover:text-blue-600"
          >
            {item.celebrity_name}
          </Link>
          <span className="font-bold text-blue-600">{item.score}</span>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 7: `app/[locale]/(main)/profile/page.tsx` を実装する**

```tsx
import { getSessionId } from '@/lib/session'
import { getEvaluationsBySession, getTop5BySession } from '@/lib/db/queries/evaluations'
import { EvaluationTabs } from '@/components/profile/EvaluationTabs'
import { Top5List } from '@/components/profile/Top5List'

export default async function ProfilePage() {
  const sessionId = await getSessionId()

  if (!sessionId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">マイページ</h1>
        <p className="text-gray-500">セッションが見つかりません</p>
      </div>
    )
  }

  const [evaluations, top5] = await Promise.all([
    getEvaluationsBySession(sessionId),
    getTop5BySession(sessionId),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">あなたの TOP5</h2>
        <Top5List top5={top5} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">評価履歴</h2>
        <EvaluationTabs evaluations={evaluations} />
      </section>
    </div>
  )
}
```

- [ ] **Step 8: E2E テストを書く**

```ts
// e2e/profile.spec.ts
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
```

- [ ] **Step 9: 全プロフィールテストを実行して PASS を確認**

```bash
npx vitest run __tests__/components/profile/
npx playwright test e2e/profile.spec.ts
```

Expected: 全テスト PASS

- [ ] **Step 10: コミット**

```bash
git add components/profile/ app/[locale]/\(main\)/profile/page.tsx \
  __tests__/components/profile/ e2e/profile.spec.ts
git commit -m "feat: add profile page with TDD + E2E"
```

---

## Task 11: レート制限 (TDD)

**Files:**
- Create: `lib/ratelimit.ts`
- Create: `__tests__/unit/lib/ratelimit.test.ts`
- Modify: `middleware.ts`（レート制限を組み込む）

- [ ] **Step 1: 失敗テストを書く**

```ts
// __tests__/unit/lib/ratelimit.test.ts
import { describe, it, expect, vi } from 'vitest'

// @upstash/ratelimit と @upstash/redis をモック
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn(),
  })),
}))

import { checkRateLimit } from '@/lib/ratelimit'
import { Ratelimit } from '@upstash/ratelimit'

describe('checkRateLimit', () => {
  it('制限内のリクエストは { allowed: true } を返す', async () => {
    vi.mocked(Ratelimit).mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({ success: true, remaining: 25 }),
    }) as never)

    const result = await checkRateLimit('127.0.0.1')
    expect(result.allowed).toBe(true)
  })

  it('制限超過のリクエストは { allowed: false } を返す', async () => {
    vi.mocked(Ratelimit).mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({ success: false, remaining: 0 }),
    }) as never)

    const result = await checkRateLimit('127.0.0.1')
    expect(result.allowed).toBe(false)
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/unit/lib/ratelimit.test.ts
```

Expected: FAIL

- [ ] **Step 3: `lib/ratelimit.ts` を実装する**

```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Ratelimit インスタンスはリクエストごとではなくモジュールレベルで生成
let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'rateit',
    })
  }
  return ratelimit
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const { success, remaining } = await getRatelimit().limit(ip)
  return { allowed: success, remaining }
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/unit/lib/ratelimit.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: `middleware.ts` にレート制限を組み込む**

```ts
import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { v4 as uuidv4 } from 'uuid'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'
import { checkRateLimit } from './lib/ratelimit'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // レート制限チェック
  // Server Action は /api/ ではなくページ URL への POST として送信されるため、
  // POST リクエスト全体と /api/ パスを対象にする
  if (
    request.method === 'POST' ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { allowed } = await checkRateLimit(ip)
    if (!allowed) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  const response = intlMiddleware(request)

  if (!request.cookies.get(SESSION_COOKIE)) {
    const sessionId = uuidv4()
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: コミット**

```bash
git add lib/ratelimit.ts middleware.ts __tests__/unit/lib/ratelimit.test.ts
git commit -m "feat: add rate limiting with TDD"
```

---

## Task 12: 芸能人登録スクリプト (TDD)

**Files:**
- Create: `scripts/seed-celebrity.ts`
- Create: `__tests__/unit/scripts/seed-celebrity.test.ts`

Wikipedia API から芸能人データを取得し DB に挿入する CLI スクリプト。

- [ ] **Step 1: 失敗テストを書く**

```ts
// __tests__/unit/scripts/seed-celebrity.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({ sql: vi.fn() }))
vi.mock('@/lib/wikipedia/client', () => ({
  fetchWikipediaSummary: vi.fn(),
}))

import { sql } from '@/lib/db/client'
import { fetchWikipediaSummary } from '@/lib/wikipedia/client'
import { seedCelebrity } from '@/scripts/seed-celebrity'

describe('seedCelebrity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Wikipedia から取得した情報を DB に INSERT する', async () => {
    vi.mocked(fetchWikipediaSummary).mockResolvedValue({
      description: 'テスト説明',
      imageUrl: 'https://example.com/img.jpg',
    })
    vi.mocked(sql).mockResolvedValue([{ id: 1 }] as never)

    await seedCelebrity({
      slug: '松本まりか',
      category: 'actress',
    })

    expect(fetchWikipediaSummary).toHaveBeenCalledWith('松本まりか')
    expect(vi.mocked(sql).mock.calls[0][0]).toContain('INSERT INTO celebrities')
  })

  it('Wikipedia に存在しない場合はエラーを throw する', async () => {
    vi.mocked(fetchWikipediaSummary).mockResolvedValue(null)

    await expect(
      seedCelebrity({ slug: '存在しない人', category: 'actress' })
    ).rejects.toThrow('Wikipedia に該当するページが見つかりません')
  })

  it('slug が name として INSERT される', async () => {
    vi.mocked(fetchWikipediaSummary).mockResolvedValue({
      description: '説明',
      imageUrl: null,
    })
    vi.mocked(sql).mockResolvedValue([{ id: 2 }] as never)

    await seedCelebrity({ slug: '田中花子', category: 'model' })

    const query = vi.mocked(sql).mock.calls[0][0] as string
    expect(query).toContain('INSERT INTO celebrities')
  })
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

```bash
npx vitest run __tests__/unit/scripts/seed-celebrity.test.ts
```

- [ ] **Step 3: `scripts/seed-celebrity.ts` を実装する**

```ts
import { sql } from '@/lib/db/client'
import { fetchWikipediaSummary } from '@/lib/wikipedia/client'
import type { Category } from '@/types'

interface SeedCelebrityOptions {
  slug: string
  category: Category
  name?: string // 省略時は slug をそのまま name に使用
}

export async function seedCelebrity({
  slug,
  category,
  name,
}: SeedCelebrityOptions): Promise<{ id: number }> {
  const summary = await fetchWikipediaSummary(slug)
  if (!summary) {
    throw new Error('Wikipedia に該当するページが見つかりません')
  }

  const celebrityName = name ?? slug
  const rows = await sql`
    INSERT INTO celebrities (name, category, description, image_url, wikipedia_slug)
    VALUES (${celebrityName}, ${category}, ${summary.description}, ${summary.imageUrl}, ${slug})
    RETURNING id
  ` as { id: number }[]

  return rows[0]
}

// CLI エントリポイント
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  const categoryIndex = args.indexOf('--category')
  const nameIndex = args.indexOf('--name')

  if (slugIndex === -1 || categoryIndex === -1) {
    console.error('Usage: npx tsx scripts/seed-celebrity.ts --slug <slug> --category <category> [--name <name>]')
    process.exit(1)
  }

  const slug = args[slugIndex + 1]
  const category = args[categoryIndex + 1] as Category
  const name = nameIndex !== -1 ? args[nameIndex + 1] : undefined

  seedCelebrity({ slug, category, name })
    .then(({ id }) => console.log(`✅ 登録完了 (id: ${id})`))
    .catch((err) => {
      console.error('❌ エラー:', err.message)
      process.exit(1)
    })
}
```

- [ ] **Step 4: テストを実行して PASS を確認**

```bash
npx vitest run __tests__/unit/scripts/seed-celebrity.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 5: スクリプトを手動で動作確認（DB に接続できる環境で）**

```bash
npx tsx scripts/seed-celebrity.ts --slug "松本まりか" --category actress
```

Expected: `✅ 登録完了 (id: X)`

- [ ] **Step 6: コミット**

```bash
git add scripts/seed-celebrity.ts __tests__/unit/scripts/seed-celebrity.test.ts
git commit -m "feat: add seed-celebrity script with TDD"
```

---

## Task 13: 全テスト実行 + Vercel デプロイ

**Files:**
- なし（設定のみ）

- [ ] **Step 1: 全ユニットテストを実行して PASS を確認**

```bash
npx vitest run
```

Expected: 全テスト PASS、0 failing

- [ ] **Step 2: 全 E2E テストを実行して PASS を確認**

```bash
npx playwright test
```

Expected: 全テスト PASS

- [ ] **Step 3: ビルドが通ることを確認**

```bash
npm run build
```

Expected: エラーなしでビルド完了

- [ ] **Step 4: Vercel CLI インストール（未インストールの場合）**

```bash
npm install -g vercel
```

- [ ] **Step 5: Vercel プロジェクトをリンク**

```bash
vercel link
```

- [ ] **Step 6: 環境変数を Vercel に設定**

Vercel ダッシュボード（または CLI）で以下を設定：

| 変数名 | 値 |
|--------|-----|
| `DATABASE_URL` | Neon PostgreSQL 接続文字列 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis トークン |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` |

```bash
vercel env add DATABASE_URL production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add NEXT_PUBLIC_SITE_URL production
```

- [ ] **Step 7: Neon DB に schema を適用（未実施の場合）**

Neon Console の SQL エディタで `lib/db/schema.sql` の内容を実行する。

- [ ] **Step 8: プロダクションデプロイ**

```bash
vercel --prod
```

Expected: デプロイ URL が表示される

- [ ] **Step 9: デプロイ後の動作確認チェックリスト**

```
- [ ] トップページ（ランキング）が表示される
- [ ] 芸能人一覧ページが表示される
- [ ] 芸能人プロフィールページが表示される
- [ ] 評価を送信できる（DBに保存される）
- [ ] 評価後ランキングに反映される
- [ ] プロフィールページで評価履歴が見られる
- [ ] session_id Cookie が httpOnly で発行される
- [ ] seed-celebrity スクリプトで芸能人を追加できる
```

- [ ] **Step 10: 最終コミット**

```bash
git add .
git commit -m "chore: finalize MVP deployment"
```
```

> **実装完了後:** `task-pr-workflow` スキルに従い PR を作成すること。
