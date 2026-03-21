# RateIt Her — 設計仕様書

**作成日:** 2026-03-21
**ステータス:** 承認済み

---

## 概要

女優・モデル・AV女優など芸能人を評価・ランキングするUGC型コンテンツサイト。アダルトアフィリエイトによるマネタイズを目的とし、SNS（RED・TikTok・YouTube）からの集客を経てサイトへ誘導する事業構造を持つ。

---

## 事業構造

```
RED・TikTok・YouTubeアカウント（集客）
        ↓
  「RateIt Her で検索」誘導
        ↓
RateIt Her（UGC型評価サイト）
        ↓
アダルトアフィリエイトバナー（マネタイズ）
```

---

## 技術スタック

| 項目 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 15（App Router） |
| データベース | Neon（サーバーレス PostgreSQL） |
| デプロイ | Vercel |
| 認証 | 匿名セッションID（httpOnly Cookie、有効期限1年） |
| 画像取得 | Wikipedia REST API |
| 国際化 | next-intl（日本語ファースト、英語・中国語は後続対応） |

---

## 認証設計：匿名セッションID方式

ユーザー登録・ログイン不要。個人情報ゼロ。

- 初回アクセス時にサーバーがUUID v4を生成し、`httpOnly` Cookie（`session_id`）として発行
- セッション発行は **`middleware.ts`** で行う（全リクエストに先行して実行されるため確実）
- `middleware.ts` は `next-intl` の `createMiddleware` と chain する構成とする。実行順序は「セッション発行 → next-intl ロケール検出」の順
- セッション発行は middleware の `response` オブジェクトに Set-Cookie するため、同一リクエスト内の SSR コンポーネントでは `cookies()` から即座に読み取れる
- Cookie の有効期限は1年（`maxAge: 365 * 24 * 60 * 60`）
- 以降のリクエストはすべてこの `session_id` で識別
- Cookie 削除・別デバイスでは別セッション扱い（評価履歴は引き継がれない）
- `httpOnly` により JS からの読み取り不可（XSS対策）
- UUID は十分なランダム性があり推測は現実的に不可能

---

## データベース設計

### celebrities

```sql
CREATE TABLE celebrities (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL,  -- 'actress' | 'model' | 'av_actress'
  image_url      TEXT,           -- Wikipedia/TMDB から取得
  wikipedia_slug TEXT,           -- Wikipedia API のページ識別子
  created_at     TIMESTAMP DEFAULT NOW()
);
```

### evaluations

```sql
CREATE TABLE evaluations (
  id             SERIAL PRIMARY KEY,
  session_id     UUID NOT NULL,
  celebrity_id   INTEGER NOT NULL REFERENCES celebrities(id),
  type_vote      TEXT NOT NULL,  -- 'cute' | 'sexy' | 'cool'
  score          NUMERIC(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, celebrity_id)
);
```

### celebrity_rankings（VIEW）

```sql
CREATE VIEW celebrity_rankings AS
SELECT
  c.id,
  c.name,
  c.category,
  c.image_url,
  ROUND(AVG(e.score), 2)                                          AS avg_score,
  COUNT(e.id)                                                      AS vote_count,
  MODE() WITHIN GROUP (ORDER BY e.type_vote)                       AS dominant_type,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cute'), 2)      AS avg_score_cute,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cute')           AS vote_count_cute,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'sexy'), 2)      AS avg_score_sexy,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'sexy')           AS vote_count_sexy,
  ROUND(AVG(e.score) FILTER (WHERE e.type_vote = 'cool'), 2)      AS avg_score_cool,
  COUNT(e.id)       FILTER (WHERE e.type_vote = 'cool')           AS vote_count_cool
FROM celebrities c
LEFT JOIN evaluations e ON e.celebrity_id = c.id
GROUP BY c.id;
```

**ランキングタブのクエリ方針:**
- 「全体」タブ → `avg_score` で ORDER BY（`vote_count = 0` の芸能人は除外）
- 「Cute」タブ → `avg_score_cute` で ORDER BY（`vote_count_cute = 0` の芸能人は除外）
- 「Sexy」タブ → `avg_score_sexy` で ORDER BY（`vote_count_sexy = 0` の芸能人は除外）
- 「Cool」タブ → `avg_score_cool` で ORDER BY（`vote_count_cool = 0` の芸能人は除外）
- 0票の芸能人はランキングに表示しない（`WHERE vote_count > 0` でフィルタ）
- ランキングページは各タブ上位50件を表示。芸能人一覧ページは全件表示（MVP初期は〜100件を想定）

**dominant_type（公式タイプ）の同数時の挙動:**
- `MODE()` は同数の場合、文字列のアルファベット順（`cool < cute < sexy`）で先頭を返す
- MVP ではこの挙動をそのまま採用する（同数時に複数タイプを表示する実装はしない）

**その他設計上のポイント:**
- `users` テーブルは不要（匿名セッションID方式のため）
- `UNIQUE(session_id, celebrity_id)` で1セッション1芸能人1評価を保証
- 評価の変更は UPSERT（`ON CONFLICT DO UPDATE SET score=?, type_vote=?, updated_at=NOW()`）で対応
- `updated_at` は UPSERT クエリで明示的に `NOW()` をセット（PostgreSQL は自動更新しないため）。後続対応として `BEFORE UPDATE` トリガーを追加予定
- `comment` カラムはMVPスコープ外（後続対応）

---

## ディレクトリ構成

```
rateit-her/
├── middleware.ts                # セッションID発行・ロケール検出
├── app/
│   └── [locale]/               # ja（デフォルト）/ en / zh（将来）
│       ├── (main)/
│       │   ├── page.tsx         # トップ・ランキング
│       │   ├── celebrities/
│       │   │   ├── page.tsx     # 芸能人一覧・名前検索
│       │   │   └── [id]/page.tsx # 芸能人プロフィール・評価フォーム
│       │   └── profile/
│       │       └── page.tsx     # ユーザープロフィール・評価履歴
│       └── layout.tsx
├── messages/
│   ├── ja.json                  # MVP時点で用意
│   ├── en.json                  # 後続対応
│   └── zh.json                  # 後続対応
├── lib/
│   ├── supabase/                # DBクライアント・型定義
│   └── wikipedia/               # Wikipedia APIクライアント
└── components/
    ├── ranking/
    │   ├── RankingTabs.tsx      # 全体/Cute/Sexy/Coolタブ
    │   └── RankingCard.tsx      # 芸能人カード（順位・スコア・画像）
    ├── celebrity/
    │   ├── TypeVoteBar.tsx      # タイプ票数バー
    │   └── EvaluationForm.tsx   # タイプ選択＋スコア入力（Client Component）
    ├── profile/
    │   ├── EvaluationTabs.tsx   # Cute/Sexy/Coolタブ別履歴
    │   └── Top5List.tsx         # ユーザーTOP5
    └── ui/                      # Button・Input など共通UI
```

---

## ページ一覧

| URL | 内容 | レンダリング |
|-----|------|------------|
| `/` | トップ・ランキング（全体/Cute/Sexy/Coolタブ） | SSR |
| `/celebrities?q=` | 芸能人一覧・名前検索（URLクエリパラメータ `?q=` を SSR で受け取り Neon（PostgreSQL）の `ilike` でフィルタ） | SSR |
| `/celebrities/[id]` | 芸能人プロフィール・評価フォーム | SSR + Client |
| `/profile` | ユーザープロフィール・評価履歴 | SSR（session_id必須） |

---

## 評価システム

### タイプ投票
- `Cute` / `Sexy` / `Cool` の3択から1つ選択
- 各タイプの票数をリアルタイム表示
- 最多得票タイプが「公式タイプ」として表示される

### 総合評価
- 1.0〜5.0点（0.1刻み）
- タイプ投票と同時に入力（2アクションで完結）

### ランキング
- トップページにタブ4つ（全体 / Cute / Sexy / Cool）
- 各タブ内で総合スコア平均が高い順に表示
- 芸能人ページでは全ユーザー平均評価・自セッション評価をそれぞれ表示

---

## 評価送信 Server Action

評価フォーム送信は Next.js Server Action として実装する。DB に直接書き込む前に以下のバリデーションを行う：

```ts
// lib/actions/evaluate.ts
const schema = z.object({
  celebrity_id: z.number().int().positive(),
  type_vote:    z.enum(['cute', 'sexy', 'cool']),
  score:        z.number().min(1.0).max(5.0).multipleOf(0.1),
});
```

- `session_id` は Cookie から取得（クライアントからは受け取らない）
- `score` の小数バリデーションは浮動小数点誤差を避けるため `Math.round(score * 10)` で整数変換してから範囲チェックを行う
- バリデーション失敗時は 400 相当のエラーをフォームに返す
- 成功時は UPSERT を実行し、`updated_at = NOW()` を明示的にセット

---

## Wikipedia API 連携

- 芸能人データは **管理者がNeon Consoleで直接登録する際に取得・保存**する
- `wikipedia_slug` を元に `https://ja.wikipedia.org/api/rest_v1/page/summary/{slug}` を呼び出す
- 取得した `description`（抜粋）と `thumbnail.source`（画像URL）を `celebrities` テーブルに保存
- APIはビルド時・リクエスト時には呼ばない（DB保存済みのデータを参照するのみ）
- 画像が取得できない場合は `image_url = NULL`、UI側でプレースホルダーを表示
- 芸能人登録時は `scripts/seed-celebrity.ts` を CLI から実行する（Neon Console は手入力UIのため API 呼び出し不可）。スクリプトは `wikipedia_slug` を引数に受け取り、Wikipedia API から取得した `description` と `image_url` を自動入力してDBに保存する
  - 使用例: `npx tsx scripts/seed-celebrity.ts --slug "松本まりか" --category actress`

---

## レート制限・スパム対策

MVP での最低限の対策として、Vercel Edge の rate limit を活用する：

- `/api/` および Server Action エンドポイントに対し、同一IP から **1分間に30リクエスト** を超えた場合は 429 を返す
- MVPは **`@upstash/ratelimit`**（Upstash Redis 無料枠）を使用する（Vercel Pro 不要で導入できるため）
- DB レベルの UNIQUE 制約により、同一セッションの重複投票はそもそも防止されている

---

## エラーハンドリング

| ケース | 対応 |
|--------|------|
| 評価の二重送信 | UPSERT で上書き、エラーにしない |
| Wikipedia APIが取得できない | `image_url` / `description` は nullable、フォールバック表示 |
| 存在しない芸能人ID | `notFound()` で404ページ |
| Cookie なし | アクセス時に自動再発行 |
| DBエラー | 500エラー＋トースト通知 |

---

## テスト方針（MVP）

- 自動テストは最小限、手動テストを主体とする
- 評価フォーム送信・二重投票防止・ランキング反映を重点的に確認
- 将来的に `Vitest` + `Playwright` でE2Eテストを追加できる構造を維持

---

## MVPスコープ

### 含む
- 芸能人プロフィールページ（Wikipedia API連携）
- タイプ投票・総合評価フォーム
- ランキングページ（4タブ）
- 芸能人一覧・名前検索
- ユーザープロフィールページ（セッション単位の評価履歴・TOP5）
- 匿名セッションID認証
- 日本語UI

### 含まない（後続対応）
- コメント機能
- 英語・中国語UI
- 管理画面（MVP中はNeon Consoleで直接登録）
- 自動テスト

---

## 環境変数

| 変数名 | 用途 | 公開範囲 |
|--------|------|---------|
| `DATABASE_URL` | Neon PostgreSQL 接続文字列 | サーバーのみ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL（レート制限用） | サーバーのみ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis トークン | サーバーのみ |
| `NEXT_PUBLIC_SITE_URL` | Vercel デプロイURL（OGPなどで使用） | 公開可 |

---

## 対象芸能人カテゴリ

- 日本人女優（`actress`）
- ハリウッド女優（`actress`）
- モデル（`model`）
- AV女優（`av_actress`）

---

## プロフィールページ：空状態

評価が0件の場合は「まだ評価した芸能人がいません。ランキングから探してみましょう」などの誘導メッセージとランキングページへのリンクを表示する。
