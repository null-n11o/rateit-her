# RateIt Her MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 芸能人評価・ランキングサイト「RateIt Her」のMVPを構築・Vercelにデプロイする

**Architecture:** Next.js 15 App Router（SSR）+ Neon PostgreSQL（サーバーレス）+ 匿名セッションID（httpOnly Cookie）。評価送信は Server Action 経由でバリデーション後 UPSERT。ランキング集計は PostgreSQL VIEW で処理。

**Tech Stack:** Next.js 15, next-intl, @neondatabase/serverless, zod, @upstash/ratelimit, @upstash/redis, TypeScript, Tailwind CSS

---

## File Map

```
rateit-her/
├── middleware.ts                               # セッションID発行 + next-intl ロケール検出
├── i18n/
│   ├── routing.ts                              # next-intl ルーティング設定
│   └── request.ts                              # next-intl リクエスト設定
├── app/
│   └── [locale]/
│       ├── layout.tsx                          # ルートレイアウト（next-intl Provider）
│       ├── not-found.tsx
│       └── (main)/
│           ├── page.tsx                        # トップ・ランキング
│           ├── celebrities/
│           │   ├── page.tsx                    # 芸能人一覧・検索
│           │   └── [id]/
│           │       └── page.tsx                # 芸能人プロフィール
│           └── profile/
│               └── page.tsx                    # ユーザープロフィール
├── lib/
│   ├── db/
│   │   ├── client.ts                           # Neon DBクライアント
│   │   ├── schema.sql                          # テーブル定義・VIEW
│   │   ├── queries/
│   │   │   ├── celebrities.ts                  # celebrities テーブルのクエリ
│   │   │   └── evaluations.ts                  # evaluations テーブルのクエリ
│   │   └── (types は types/index.ts で管理)
│   ├── actions/
│   │   └── evaluate.ts                         # 評価送信 Server Action
│   ├── wikipedia/
│   │   └── client.ts                           # Wikipedia REST API クライアント
│   └── session.ts                              # Cookie からの session_id 取得
├── components/
│   ├── ranking/
│   │   ├── RankingTabs.tsx                     # 全体/Cute/Sexy/Coolタブ（Client）
│   │   └── RankingCard.tsx                     # 芸能人カード（Server）
│   ├── celebrity/
│   │   ├── TypeVoteBar.tsx                     # タイプ票数バー（Server）
│   │   └── EvaluationForm.tsx                  # 評価フォーム（Client）
│   ├── profile/
│   │   ├── EvaluationTabs.tsx                  # 評価履歴タブ（Client）
│   │   └── Top5List.tsx                        # TOP5リスト（Server）
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Toast.tsx
├── messages/
│   └── ja.json                                 # 日本語UIテキスト
├── scripts/
│   └── seed-celebrity.ts                       # 芸能人登録CLIスクリプト
└── types/
    └── index.ts                                # 共通型定義
```

---

## Task 1: プロジェクト初期化

**Files:**
- Create: `package.json` (via npx)
- Create: `tailwind.config.ts`
- Create: `.env.local`
- Create: `.env.example`
- Create: `types/index.ts`

- [ ] **Step 1: Next.js プロジェクト作成**

```bash
cd /Users/nakanokentaro/develop/active/rateit-her
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=no \
  --import-alias="@/*" \
  --no-turbopack
```

プロンプトに `y` で答えて既存ファイルを上書きする。

- [ ] **Step 2: 依存パッケージをインストール**

```bash
npm install next-intl @neondatabase/serverless zod @upstash/ratelimit @upstash/redis
npm install -D tsx
```

- [ ] **Step 3: 共通型定義を作成**

`types/index.ts` を作成：

```typescript
export type TypeVote = 'cute' | 'sexy' | 'cool'
export type Category = 'actress' | 'model' | 'av_actress'

export interface Celebrity {
  id: number
  name: string
  description: string | null
  category: Category
  image_url: string | null
  wikipedia_slug: string | null
  created_at: string
}

export interface CelebrityRanking {
  id: number
  name: string
  category: Category
  image_url: string | null
  avg_score: number | null
  vote_count: number
  dominant_type: TypeVote | null
  avg_score_cute: number | null
  vote_count_cute: number
  avg_score_sexy: number | null
  vote_count_sexy: number
  avg_score_cool: number | null
  vote_count_cool: number
}

export interface Evaluation {
  id: number
  session_id: string
  celebrity_id: number
  type_vote: TypeVote
  score: number
  created_at: string
  updated_at: string
}
```

- [ ] **Step 4: 環境変数ファイルを作成**

`.env.local`（実際の値を入れる）:

```
DATABASE_URL=postgres://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.example`（コミット用テンプレート）:

```
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 5: .gitignore に .env.local を確認**

```bash
grep ".env.local" .gitignore
```

`.env.local` が含まれていることを確認。

- [ ] **Step 6: 動作確認**

```bash
npm run dev
```

`http://localhost:3000` にアクセスして Next.js のデフォルトページが表示されること。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: データベーススキーマ

**Files:**
- Create: `lib/db/schema.sql`
- Create: `lib/db/client.ts`
- Create: `lib/db/types.ts`

- [ ] **Step 1: Neon プロジェクトを作成**

1. https://neon.tech にアクセスしてアカウント作成
2. 新しいプロジェクト「rateit-her」を作成
3. 接続文字列（`postgres://...`）を `.env.local` の `DATABASE_URL` にセット

- [ ] **Step 2: スキーマファイルを作成**

`lib/db/schema.sql`:

```sql
-- celebrities テーブル
CREATE TABLE IF NOT EXISTS celebrities (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL CHECK (category IN ('actress', 'model', 'av_actress')),
  image_url      TEXT,
  wikipedia_slug TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- evaluations テーブル
CREATE TABLE IF NOT EXISTS evaluations (
  id             SERIAL PRIMARY KEY,
  session_id     UUID NOT NULL,
  celebrity_id   INTEGER NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  type_vote      TEXT NOT NULL CHECK (type_vote IN ('cute', 'sexy', 'cool')),
  score          NUMERIC(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, celebrity_id)
);

-- インデックス（検索・ランキングの高速化）
CREATE INDEX IF NOT EXISTS idx_evaluations_celebrity_id ON evaluations(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_celebrities_name ON celebrities(name);

-- ランキング集計 VIEW
CREATE OR REPLACE VIEW celebrity_rankings AS
SELECT
  c.id,
  c.name,
  c.category,
  c.image_url,
  ROUND(AVG(e.score), 2)                                       AS avg_score,
  COUNT(e.id)                                                   AS vote_count,
  MODE() WITHIN GROUP (ORDER BY e.type_vote)                    AS dominant_type,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cute'), 2)   AS avg_score_cute,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cute')        AS vote_count_cute,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'sexy'), 2)   AS avg_score_sexy,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'sexy')        AS vote_count_sexy,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cool'), 2)   AS avg_score_cool,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cool')        AS vote_count_cool
FROM celebrities c
LEFT JOIN evaluations e ON e.celebrity_id = c.id
GROUP BY c.id;
```

- [ ] **Step 3: スキーマを Neon に適用**

```bash
npx tsx -e "
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const sql = neon(process.env.DATABASE_URL!)
const schema = readFileSync('lib/db/schema.sql', 'utf-8')
await sql.unsafe(schema)
console.log('Schema applied successfully')
" --env-file .env.local
```

出力: `Schema applied successfully`

- [ ] **Step 4: DB クライアントを作成**

`lib/db/client.ts`:

```typescript
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const sql = neon(process.env.DATABASE_URL)
```

- [ ] **Step 5: コミット**

```bash
git add lib/db/
git commit -m "feat: add database schema and Neon client"
```

---

## Task 3: DB クエリ層

**Files:**
- Create: `lib/db/queries/celebrities.ts`
- Create: `lib/db/queries/evaluations.ts`

- [ ] **Step 1: celebrities クエリを作成**

`lib/db/queries/celebrities.ts`:

```typescript
import { sql } from '../client'
import type { Celebrity, CelebrityRanking, TypeVote } from '@/types'

export async function getCelebrities(search?: string): Promise<Celebrity[]> {
  if (search) {
    return sql`
      SELECT * FROM celebrities
      WHERE name ILIKE ${'%' + search + '%'}
      ORDER BY name ASC
    ` as Promise<Celebrity[]>
  }
  return sql`SELECT * FROM celebrities ORDER BY name ASC` as Promise<Celebrity[]>
}

export async function getCelebrityById(id: number): Promise<Celebrity | null> {
  const rows = await sql`SELECT * FROM celebrities WHERE id = ${id}` as Celebrity[]
  return rows[0] ?? null
}

export async function getRankings(tab: 'all' | TypeVote, limit = 50): Promise<CelebrityRanking[]> {
  // @neondatabase/serverless はカラム名の動的補間をサポートしないため、明示的に分岐する
  if (tab === 'all') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count > 0
      ORDER BY avg_score DESC NULLS LAST
      LIMIT ${limit}
    ` as Promise<CelebrityRanking[]>
  }
  if (tab === 'cute') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count_cute > 0
      ORDER BY avg_score_cute DESC NULLS LAST
      LIMIT ${limit}
    ` as Promise<CelebrityRanking[]>
  }
  if (tab === 'sexy') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count_sexy > 0
      ORDER BY avg_score_sexy DESC NULLS LAST
      LIMIT ${limit}
    ` as Promise<CelebrityRanking[]>
  }
  // cool
  return sql`
    SELECT * FROM celebrity_rankings
    WHERE vote_count_cool > 0
    ORDER BY avg_score_cool DESC NULLS LAST
    LIMIT ${limit}
  ` as Promise<CelebrityRanking[]>
}

export async function getCelebrityRanking(id: number): Promise<CelebrityRanking | null> {
  const rows = await sql`
    SELECT * FROM celebrity_rankings WHERE id = ${id}
  ` as CelebrityRanking[]
  return rows[0] ?? null
}
```

- [ ] **Step 2: evaluations クエリを作成**

`lib/db/queries/evaluations.ts`:

```typescript
import { sql } from '../client'
import type { Evaluation, TypeVote } from '@/types'

export async function getEvaluationBySession(
  sessionId: string,
  celebrityId: number
): Promise<Evaluation | null> {
  const rows = await sql`
    SELECT * FROM evaluations
    WHERE session_id = ${sessionId}::uuid AND celebrity_id = ${celebrityId}
  ` as Evaluation[]
  return rows[0] ?? null
}

export async function getEvaluationsBySession(sessionId: string): Promise<
  (Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]
> {
  return sql`
    SELECT e.*, c.name AS celebrity_name, c.image_url AS celebrity_image_url
    FROM evaluations e
    JOIN celebrities c ON c.id = e.celebrity_id
    WHERE e.session_id = ${sessionId}::uuid
    ORDER BY e.updated_at DESC
  ` as Promise<(Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]>
}

export async function getTop5BySession(sessionId: string): Promise<
  (Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]
> {
  return sql`
    SELECT e.*, c.name AS celebrity_name, c.image_url AS celebrity_image_url
    FROM evaluations e
    JOIN celebrities c ON c.id = e.celebrity_id
    WHERE e.session_id = ${sessionId}::uuid
    ORDER BY e.score DESC
    LIMIT 5
  ` as Promise<(Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]>
}

export async function upsertEvaluation(params: {
  sessionId: string
  celebrityId: number
  typeVote: TypeVote
  score: number
}): Promise<void> {
  const { sessionId, celebrityId, typeVote, score } = params
  await sql`
    INSERT INTO evaluations (session_id, celebrity_id, type_vote, score)
    VALUES (${sessionId}::uuid, ${celebrityId}, ${typeVote}, ${score})
    ON CONFLICT (session_id, celebrity_id)
    DO UPDATE SET
      type_vote  = EXCLUDED.type_vote,
      score      = EXCLUDED.score,
      updated_at = NOW()
  `
}
```

- [ ] **Step 3: コミット**

```bash
git add lib/db/queries/
git commit -m "feat: add database query layer"
```

---

## Task 4: セッション管理 + Middleware

**Files:**
- Create: `lib/session.ts`
- Create: `i18n/routing.ts`
- Create: `i18n/request.ts`
- Create: `middleware.ts`

- [ ] **Step 1: セッションユーティリティを作成**

`lib/session.ts`:

```typescript
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export const SESSION_COOKIE = 'session_id'
export const SESSION_MAX_AGE = 365 * 24 * 60 * 60 // 1年（秒）

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}
```

- [ ] **Step 2: next-intl ルーティング設定を作成**

`i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ja', 'en', 'zh'],
  defaultLocale: 'ja',
})
```

`i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'ja' | 'en' | 'zh')) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 3: Middleware を作成**

`middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  // セッションIDが未発行なら発行する（crypto.randomUUID() はEdge Runtimeネイティブ）
  if (!request.cookies.get(SESSION_COOKIE)) {
    const sessionId = crypto.randomUUID()
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

- [ ] **Step 4: 動作確認**

```bash
npm run dev
```

ブラウザの DevTools → Application → Cookies で `session_id` Cookie が発行されることを確認。再読み込みしても同じ値が保持されること。

- [ ] **Step 5: コミット**

```bash
git add lib/session.ts i18n/ middleware.ts
git commit -m "feat: add session middleware and next-intl routing"
```

---

## Task 5: i18n メッセージ + レイアウト

**Files:**
- Create: `messages/ja.json`
- Modify: `app/[locale]/layout.tsx`
- Create: `app/[locale]/not-found.tsx`
- Create: `next.config.ts`

- [ ] **Step 1: 日本語メッセージを作成**

`messages/ja.json`:

```json
{
  "nav": {
    "home": "ホーム",
    "celebrities": "芸能人一覧",
    "profile": "マイページ"
  },
  "ranking": {
    "title": "ランキング",
    "tabs": {
      "all": "総合",
      "cute": "Cute",
      "sexy": "Sexy",
      "cool": "Cool"
    },
    "rank": "{rank}位",
    "votes": "{count}票",
    "noData": "まだ評価がありません"
  },
  "celebrity": {
    "evaluate": "評価する",
    "yourRating": "あなたの評価",
    "avgRating": "平均評価",
    "officialType": "公式タイプ",
    "typeVote": {
      "cute": "Cute",
      "sexy": "Sexy",
      "cool": "Cool"
    },
    "submit": "評価を送信",
    "updated": "評価を更新しました"
  },
  "celebrities": {
    "title": "芸能人一覧",
    "searchPlaceholder": "名前で検索...",
    "noResults": "該当する芸能人が見つかりません"
  },
  "profile": {
    "title": "マイページ",
    "top5": "あなたのTOP5",
    "history": "評価履歴",
    "empty": "まだ評価した芸能人がいません。ランキングから探してみましょう",
    "goToRanking": "ランキングへ"
  },
  "errors": {
    "notFound": "ページが見つかりません",
    "serverError": "エラーが発生しました。しばらく経ってから再試行してください"
  }
}
```

- [ ] **Step 2: next.config.ts を更新**

`next.config.ts`:

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
}

export default withNextIntl(nextConfig)
```

- [ ] **Step 3: ルートレイアウトを更新**

`app/[locale]/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

export const metadata: Metadata = {
  title: 'RateIt Her',
  description: '芸能人を評価・ランキングするサイト',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'ja' | 'en' | 'zh')) {
    notFound()
  }
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <header className="border-b px-4 py-3">
            <a href={`/${locale}`} className="font-bold text-lg">RateIt Her</a>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-6">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: not-found.tsx を作成**

`app/[locale]/not-found.tsx`:

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-500 mb-6">ページが見つかりません</p>
      <Link href="/" className="text-pink-500 hover:underline">ホームへ戻る</Link>
    </div>
  )
}
```

- [ ] **Step 5: 動作確認**

```bash
npm run dev
```

`http://localhost:3000` が日本語レイアウトで表示されること。

- [ ] **Step 6: コミット**

```bash
git add messages/ app/ next.config.ts i18n/
git commit -m "feat: add i18n messages, root layout, and not-found page"
```

---

## Task 6: 共通UIコンポーネント

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/Toast.tsx`

- [ ] **Step 1: Button コンポーネントを作成**

`components/ui/Button.tsx`:

```typescript
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-pink-500 text-white hover:bg-pink-600',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? '送信中...' : children}
    </button>
  )
}
```

- [ ] **Step 2: Input コンポーネントを作成**

`components/ui/Input.tsx`:

```typescript
import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-gray-600">{label}</label>}
      <input
        className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${className}`}
        {...props}
      />
    </div>
  )
}
```

- [ ] **Step 3: Toast コンポーネントを作成**

`components/ui/Toast.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bg = type === 'success' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-2 rounded shadow-lg z-50`}>
      {message}
    </div>
  )
}
```

- [ ] **Step 4: コミット**

```bash
git add components/ui/
git commit -m "feat: add shared UI components"
```

---

## Task 7: ランキングページ

**Files:**
- Create: `components/ranking/RankingCard.tsx`
- Create: `components/ranking/RankingTabs.tsx`
- Modify: `app/[locale]/(main)/page.tsx`

- [ ] **Step 1: RankingCard を作成**

`components/ranking/RankingCard.tsx`:

```typescript
import Image from 'next/image'
import Link from 'next/link'
import type { CelebrityRanking } from '@/types'

interface RankingCardProps {
  celebrity: CelebrityRanking
  rank: number
  locale: string
}

export function RankingCard({ celebrity, rank, locale }: RankingCardProps) {
  return (
    <Link href={`/${locale}/celebrities/${celebrity.id}`} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <span className="text-xl font-bold text-gray-400 w-8 text-center">{rank}</span>
      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
        {celebrity.image_url ? (
          <Image src={celebrity.image_url} alt={celebrity.name} width={48} height={48} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{celebrity.name}</p>
        {celebrity.dominant_type && (
          <span className="text-xs text-pink-500 capitalize">{celebrity.dominant_type}</span>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-lg">{celebrity.avg_score?.toFixed(1) ?? '-'}</p>
        <p className="text-xs text-gray-400">{celebrity.vote_count}票</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: RankingTabs を作成**

`components/ranking/RankingTabs.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { TypeVote } from '@/types'

const TABS: { key: 'all' | TypeVote; label: string }[] = [
  { key: 'all', label: '総合' },
  { key: 'cute', label: 'Cute' },
  { key: 'sexy', label: 'Sexy' },
  { key: 'cool', label: 'Cool' },
]

interface RankingTabsProps {
  activeTab: string
}

export function RankingTabs({ activeTab }: RankingTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex border-b mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => router.push(`${pathname}?tab=${tab.key}`)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.key
              ? 'border-pink-500 text-pink-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: トップページを実装**

`app/[locale]/(main)/page.tsx`:

```typescript
import { getRankings } from '@/lib/db/queries/celebrities'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import { RankingCard } from '@/components/ranking/RankingCard'
import type { TypeVote } from '@/types'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { tab = 'all' } = await searchParams
  const validTab = ['all', 'cute', 'sexy', 'cool'].includes(tab) ? tab as 'all' | TypeVote : 'all'

  const celebrities = await getRankings(validTab)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ランキング</h1>
      <RankingTabs activeTab={validTab} />
      {celebrities.length === 0 ? (
        <p className="text-gray-400 text-center py-8">まだ評価がありません</p>
      ) : (
        <div className="divide-y">
          {celebrities.map((c, i) => (
            <RankingCard key={c.id} celebrity={c} rank={i + 1} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 手動テスト**

1. `npm run dev` を起動
2. Neon Console でテスト用の芸能人レコードを1件 INSERT する：
   ```sql
   INSERT INTO celebrities (name, category) VALUES ('テスト太郎', 'actress');
   INSERT INTO evaluations (session_id, celebrity_id, type_vote, score)
   VALUES (gen_random_uuid(), 1, 'cute', 4.5);
   ```
3. `http://localhost:3000` でランキングカードが表示されること
4. タブを切り替えてフィルタが動作すること

- [ ] **Step 5: コミット**

```bash
git add components/ranking/ app/
git commit -m "feat: add ranking page with tabs"
```

---

## Task 8: 芸能人一覧ページ

**Files:**
- Create: `app/[locale]/(main)/celebrities/page.tsx`

- [ ] **Step 1: 芸能人一覧ページを実装**

`app/[locale]/(main)/celebrities/page.tsx`:

```typescript
import { getCelebrities } from '@/lib/db/queries/celebrities'
import Image from 'next/image'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function CelebritiesPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q } = await searchParams
  const celebrities = await getCelebrities(q)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">芸能人一覧</h1>
      <form className="mb-6">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="名前で検索..."
          className="w-full max-w-sm"
        />
      </form>
      {celebrities.length === 0 ? (
        <p className="text-gray-400 text-center py-8">該当する芸能人が見つかりません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {celebrities.map((c) => (
            <Link key={c.id} href={`/${locale}/celebrities/${c.id}`} className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                {c.image_url ? (
                  <Image src={c.image_url} alt={c.name} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                )}
              </div>
              <p className="text-sm font-medium text-center">{c.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 手動テスト**

1. `http://localhost:3000/celebrities` でグリッド表示されること
2. 検索フォームに文字を入力して Enter → URLが `?q=...` になり結果がフィルタされること

- [ ] **Step 3: コミット**

```bash
git add app/
git commit -m "feat: add celebrities list page with search"
```

---

## Task 9: 評価 Server Action

**Files:**
- Create: `lib/actions/evaluate.ts`

- [ ] **Step 1: Server Action を作成**

`lib/actions/evaluate.ts`:

```typescript
'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { upsertEvaluation } from '@/lib/db/queries/evaluations'
import { SESSION_COOKIE } from '@/lib/session'
import type { TypeVote } from '@/types'

const schema = z.object({
  celebrity_id: z.number().int().positive(),
  type_vote: z.enum(['cute', 'sexy', 'cool']),
  score: z.number().refine(
    (v) => {
      const int = Math.round(v * 10)
      return int >= 10 && int <= 50
    },
    { message: 'スコアは1.0〜5.0の0.1刻みで入力してください' }
  ),
})

export type EvaluateState = {
  success: boolean
  error?: string
}

export async function evaluate(_: EvaluateState, formData: FormData): Promise<EvaluateState> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) {
    return { success: false, error: 'セッションが見つかりません。ページを再読み込みしてください。' }
  }

  const raw = {
    celebrity_id: Number(formData.get('celebrity_id')),
    type_vote: formData.get('type_vote') as TypeVote,
    score: Number(formData.get('score')),
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  try {
    await upsertEvaluation({
      sessionId,
      celebrityId: result.data.celebrity_id,
      typeVote: result.data.type_vote,
      score: result.data.score,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'エラーが発生しました。しばらく経ってから再試行してください。' }
  }
}
```

- [ ] **Step 2: コミット**

```bash
git add lib/actions/
git commit -m "feat: add evaluation server action with zod validation"
```

---

## Task 10: 芸能人プロフィールページ

**Files:**
- Create: `components/celebrity/TypeVoteBar.tsx`
- Create: `components/celebrity/EvaluationForm.tsx`
- Create: `app/[locale]/(main)/celebrities/[id]/page.tsx`

- [ ] **Step 1: TypeVoteBar を作成**

`components/celebrity/TypeVoteBar.tsx`:

```typescript
interface TypeVoteBarProps {
  cute: number
  sexy: number
  cool: number
  dominant: string | null
}

export function TypeVoteBar({ cute, sexy, cool, dominant }: TypeVoteBarProps) {
  const total = cute + sexy + cool
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <div className="space-y-2">
      {[
        { key: 'cute', label: 'Cute', count: cute, color: 'bg-pink-400' },
        { key: 'sexy', label: 'Sexy', count: sexy, color: 'bg-red-400' },
        { key: 'cool', label: 'Cool', count: cool, color: 'bg-blue-400' },
      ].map(({ key, label, count, color }) => (
        <div key={key} className="flex items-center gap-2">
          <span className={`text-sm w-12 ${dominant === key ? 'font-bold' : ''}`}>{label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct(count)}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-12 text-right">{count}票</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: EvaluationForm を作成**

`components/celebrity/EvaluationForm.tsx`:

```typescript
'use client'

import { useActionState, useEffect, useState } from 'react'
import { evaluate, type EvaluateState } from '@/lib/actions/evaluate'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import type { TypeVote } from '@/types'

const TYPES: { key: TypeVote; label: string }[] = [
  { key: 'cute', label: 'Cute' },
  { key: 'sexy', label: 'Sexy' },
  { key: 'cool', label: 'Cool' },
]

const initialState: EvaluateState = { success: false }

interface EvaluationFormProps {
  celebrityId: number
  initialTypeVote?: TypeVote
  initialScore?: number
}

export function EvaluationForm({ celebrityId, initialTypeVote, initialScore }: EvaluationFormProps) {
  const [state, formAction, isPending] = useActionState(evaluate, initialState)
  const [selectedType, setSelectedType] = useState<TypeVote>(initialTypeVote ?? 'cute')
  const [score, setScore] = useState<string>(initialScore?.toFixed(1) ?? '3.0')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (state.success) {
      setToast({ message: '評価を送信しました', type: 'success' })
    } else if (state.error) {
      setToast({ message: state.error, type: 'error' })
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="celebrity_id" value={celebrityId} />

      <div>
        <p className="text-sm text-gray-600 mb-2">タイプを選択</p>
        <div className="flex gap-2">
          {TYPES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedType(key)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                selectedType === key ? 'bg-pink-500 text-white border-pink-500' : 'border-gray-300 hover:border-pink-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type_vote" value={selectedType} />
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">スコア: <span className="font-bold text-pink-500">{score}</span></p>
        <input
          type="range"
          name="score"
          min="1.0"
          max="5.0"
          step="0.1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-full accent-pink-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1.0</span><span>3.0</span><span>5.0</span>
        </div>
      </div>

      <Button type="submit" loading={isPending} className="w-full">
        評価を送信
      </Button>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </form>
  )
}
```

- [ ] **Step 3: 芸能人プロフィールページを実装**

`app/[locale]/(main)/celebrities/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getCelebrityById, getCelebrityRanking } from '@/lib/db/queries/celebrities'
import { getEvaluationBySession } from '@/lib/db/queries/evaluations'
import { getSessionId } from '@/lib/session'
import { TypeVoteBar } from '@/components/celebrity/TypeVoteBar'
import { EvaluationForm } from '@/components/celebrity/EvaluationForm'

interface Props {
  params: Promise<{ locale: string; id: string }>
}

export default async function CelebrityPage({ params }: Props) {
  const { id } = await params
  const numId = Number(id)
  if (isNaN(numId)) notFound()

  const [celebrity, ranking, sessionId] = await Promise.all([
    getCelebrityById(numId),
    getCelebrityRanking(numId),
    getSessionId(),
  ])

  if (!celebrity) notFound()

  const myEvaluation = sessionId ? await getEvaluationBySession(sessionId, numId) : null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {celebrity.image_url ? (
            <Image src={celebrity.image_url} alt={celebrity.name} width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No img</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{celebrity.name}</h1>
          <p className="text-sm text-gray-500 capitalize">{celebrity.category}</p>
        </div>
      </div>

      {celebrity.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{celebrity.description}</p>
      )}

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">平均評価</span>
          <span className="font-bold">{ranking?.avg_score?.toFixed(1) ?? '-'} / 5.0</span>
        </div>
        {myEvaluation && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">あなたの評価</span>
            <span className="font-bold text-pink-500">{myEvaluation.score.toFixed(1)}</span>
          </div>
        )}
        <TypeVoteBar
          cute={ranking?.vote_count_cute ?? 0}
          sexy={ranking?.vote_count_sexy ?? 0}
          cool={ranking?.vote_count_cool ?? 0}
          dominant={ranking?.dominant_type ?? null}
        />
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">{myEvaluation ? '評価を更新' : '評価する'}</h2>
        <EvaluationForm
          celebrityId={celebrity.id}
          initialTypeVote={myEvaluation?.type_vote}
          initialScore={myEvaluation?.score}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 手動テスト**

1. `http://localhost:3000/celebrities/1` にアクセスしてプロフィールが表示されること
2. スライダーでスコアを設定し、タイプを選んで送信 → 「評価を送信しました」トーストが表示されること
3. 再度ページを開き「あなたの評価」が更新されていること
4. 再送信で二重投票にならず上書きされること（DB で確認）

- [ ] **Step 5: コミット**

```bash
git add components/celebrity/ app/ lib/actions/
git commit -m "feat: add celebrity profile page with evaluation form"
```

---

## Task 11: プロフィールページ

**Files:**
- Create: `components/profile/Top5List.tsx`
- Create: `components/profile/EvaluationTabs.tsx`
- Create: `app/[locale]/(main)/profile/page.tsx`

- [ ] **Step 1: Top5List を作成**

`components/profile/Top5List.tsx`:

```typescript
import Image from 'next/image'
import Link from 'next/link'
import type { Evaluation } from '@/types'

type EvalWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface Top5ListProps {
  evaluations: EvalWithCelebrity[]
  locale: string
}

export function Top5List({ evaluations, locale }: Top5ListProps) {
  if (evaluations.length === 0) return null

  return (
    <div className="space-y-2">
      {evaluations.map((e, i) => (
        <Link
          key={e.id}
          href={`/${locale}/celebrities/${e.celebrity_id}`}
          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="text-lg font-bold text-gray-400 w-6">{i + 1}</span>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {e.celebrity_image_url ? (
              <Image src={e.celebrity_image_url} alt={e.celebrity_name} width={40} height={40} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
          <span className="flex-1 text-sm font-medium">{e.celebrity_name}</span>
          <span className="font-bold text-pink-500">{Number(e.score).toFixed(1)}</span>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: EvaluationTabs を作成**

`components/profile/EvaluationTabs.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Evaluation, TypeVote } from '@/types'

type EvalWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface EvaluationTabsProps {
  evaluations: EvalWithCelebrity[]
  locale: string
}

const TABS: { key: 'all' | TypeVote; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'cute', label: 'Cute' },
  { key: 'sexy', label: 'Sexy' },
  { key: 'cool', label: 'Cool' },
]

export function EvaluationTabs({ evaluations, locale }: EvaluationTabsProps) {
  const [activeTab, setActiveTab] = useState<'all' | TypeVote>('all')
  const filtered = activeTab === 'all' ? evaluations : evaluations.filter((e) => e.type_vote === activeTab)

  return (
    <div>
      <div className="flex border-b mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-pink-500 text-pink-500' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-4 text-sm">このタイプの評価はありません</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/${locale}/celebrities/${e.celebrity_id}`}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {e.celebrity_image_url ? (
                  <Image src={e.celebrity_image_url} alt={e.celebrity_name} width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <span className="flex-1 text-sm font-medium">{e.celebrity_name}</span>
              <span className="text-xs text-pink-400 capitalize">{e.type_vote}</span>
              <span className="font-bold">{Number(e.score).toFixed(1)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: プロフィールページを実装**

`app/[locale]/(main)/profile/page.tsx`:

```typescript
import Link from 'next/link'
import { getSessionId } from '@/lib/session'
import { getEvaluationsBySession, getTop5BySession } from '@/lib/db/queries/evaluations'
import { Top5List } from '@/components/profile/Top5List'
import { EvaluationTabs } from '@/components/profile/EvaluationTabs'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params
  const sessionId = await getSessionId()

  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">まだ評価した芸能人がいません。ランキングから探してみましょう</p>
        <Link href={`/${locale}`} className="text-pink-500 hover:underline">ランキングへ</Link>
      </div>
    )
  }

  const [evaluations, top5] = await Promise.all([
    getEvaluationsBySession(sessionId),
    getTop5BySession(sessionId),
  ])

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">まだ評価した芸能人がいません。ランキングから探してみましょう</p>
        <Link href={`/${locale}`} className="text-pink-500 hover:underline">ランキングへ</Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">マイページ</h1>
      </div>

      <section>
        <h2 className="text-lg font-bold mb-3">あなたのTOP5</h2>
        <Top5List evaluations={top5} locale={locale} />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">評価履歴</h2>
        <EvaluationTabs evaluations={evaluations} locale={locale} />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: 手動テスト**

1. 芸能人を2〜3件評価する
2. `http://localhost:3000/profile` でTOP5と評価履歴が表示されること
3. タブを切り替えてフィルタが動作すること
4. 評価0件の状態でアクセスし、誘導メッセージが表示されること

- [ ] **Step 5: コミット**

```bash
git add components/profile/ app/
git commit -m "feat: add profile page with evaluation history and top5"
```

---

## Task 12: レート制限

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Upstash Redis をセットアップ**

1. https://upstash.com にアクセスしてアカウント作成
2. Redis データベースを新規作成
3. `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を `.env.local` にセット

- [ ] **Step 2: middleware.ts にレート制限を追加**

`middleware.ts` を更新：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { v4 as uuidv4 } from 'uuid'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const intlMiddleware = createMiddleware(routing)

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rateit:rl',
})

export default async function middleware(request: NextRequest) {
  // Server Actions（評価送信）にレート制限を適用
  // MVP では /api/ ルートは存在しないため Server Action のみ対象
  const isServerAction = request.method === 'POST' && request.headers.get('next-action') !== null

  if (isServerAction) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

- [ ] **Step 3: コミット**

```bash
git add middleware.ts
git commit -m "feat: add rate limiting with upstash redis"
```

---

## Task 13: 芸能人登録スクリプト

**Files:**
- Create: `lib/wikipedia/client.ts`
- Create: `scripts/seed-celebrity.ts`

- [ ] **Step 1: Wikipedia API クライアントを作成**

`lib/wikipedia/client.ts`:

```typescript
interface WikipediaSummary {
  title: string
  extract: string
  thumbnail?: { source: string }
}

export async function fetchWikipediaSummary(slug: string, lang = 'ja'): Promise<WikipediaSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'RateItHer/1.0' } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
```

- [ ] **Step 2: seed スクリプトを作成**

`scripts/seed-celebrity.ts`:

```typescript
import { neon } from '@neondatabase/serverless'
import { fetchWikipediaSummary } from '../lib/wikipedia/client'

const args = process.argv.slice(2)
const slugIdx = args.indexOf('--slug')
const categoryIdx = args.indexOf('--category')
const nameIdx = args.indexOf('--name')

const slug = slugIdx !== -1 ? args[slugIdx + 1] : null
const category = categoryIdx !== -1 ? args[categoryIdx + 1] : 'actress'
const overrideName = nameIdx !== -1 ? args[nameIdx + 1] : null

if (!slug) {
  console.error('Usage: npx tsx scripts/seed-celebrity.ts --slug "松本まりか" --category actress [--name "表示名"]')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

const summary = await fetchWikipediaSummary(slug)
if (!summary) {
  console.error(`Wikipedia から "${slug}" の情報を取得できませんでした`)
  process.exit(1)
}

const name = overrideName ?? summary.title
const description = summary.extract?.slice(0, 500) ?? null
const imageUrl = summary.thumbnail?.source ?? null

const result = await sql`
  INSERT INTO celebrities (name, description, category, image_url, wikipedia_slug)
  VALUES (${name}, ${description}, ${category}, ${imageUrl}, ${slug})
  RETURNING id, name
`

console.log(`✓ 登録完了: [${result[0].id}] ${result[0].name}`)
```

- [ ] **Step 3: 動作テスト**

```bash
npx tsx scripts/seed-celebrity.ts --slug "綾瀬はるか" --category actress --env-file .env.local
```

出力例: `✓ 登録完了: [2] 綾瀬はるか`

- [ ] **Step 4: コミット**

```bash
git add lib/wikipedia/ scripts/
git commit -m "feat: add wikipedia client and celebrity seed script"
```

---

## Task 14: Vercel デプロイ

- [ ] **Step 1: Vercel にプロジェクトを作成**

1. https://vercel.com にアクセスしてログイン
2. 「Add New Project」→ GitHub リポジトリを接続（先に `git remote add origin <repo-url>` でリモートを追加しておく）
3. Framework: Next.js が自動検出されることを確認

- [ ] **Step 2: 環境変数を Vercel に設定**

Vercel ダッシュボード → Settings → Environment Variables で以下を設定：
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_SITE_URL`（Vercel のデプロイURLに設定）

- [ ] **Step 3: デプロイ**

```bash
git push origin main
```

Vercel が自動でビルド・デプロイすることを確認。

- [ ] **Step 4: 本番動作確認**

1. デプロイURL にアクセスしてランキングページが表示されること
2. seed スクリプトで本番DBに芸能人を1件登録
3. 評価フォームを送信してランキングに反映されること
4. プロフィールページで履歴が表示されること

- [ ] **Step 5: 最終コミット**

```bash
git add .env.example
git commit -m "chore: finalize MVP deployment"
```

---

## 完了チェックリスト

- [ ] `npm run build` がエラーなく通る
- [ ] ランキングページ: 4タブで表示切り替えができる
- [ ] 芸能人一覧: 名前検索が動作する
- [ ] 芸能人プロフィール: 評価フォームが送信できる
- [ ] 評価の二重送信が上書きになる（エラーにならない）
- [ ] プロフィールページ: TOP5と評価履歴が表示される
- [ ] プロフィールページ: 0件の場合に誘導メッセージが表示される
- [ ] Cookie が httpOnly で 1年間保持される
- [ ] Vercel でビルド・デプロイが成功する
