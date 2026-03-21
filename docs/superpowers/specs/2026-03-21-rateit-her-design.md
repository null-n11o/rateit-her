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
| データベース | Supabase（PostgreSQL） |
| デプロイ | Vercel |
| 認証 | 匿名セッションID（httpOnly Cookie、有効期限1年） |
| 画像取得 | Wikipedia REST API |
| 国際化 | next-intl（日本語ファースト、英語・中国語は後続対応） |

---

## 認証設計：匿名セッションID方式

ユーザー登録・ログイン不要。個人情報ゼロ。

- 初回アクセス時にサーバーがUUID v4を生成し、`httpOnly` Cookie（`session_id`）として発行
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
  ROUND(AVG(e.score), 2)                            AS avg_score,
  COUNT(e.id)                                        AS vote_count,
  MODE() WITHIN GROUP (ORDER BY e.type_vote)         AS dominant_type
FROM celebrities c
LEFT JOIN evaluations e ON e.celebrity_id = c.id
GROUP BY c.id;
```

**設計上のポイント:**
- `users` テーブルは不要（匿名セッションID方式のため）
- `UNIQUE(session_id, celebrity_id)` で1セッション1芸能人1評価を保証
- 評価の変更は UPSERT（ON CONFLICT DO UPDATE）で対応
- `comment` カラムはMVPスコープ外（後続対応）
- ランキング集計は `celebrity_rankings` VIEWで事前集計しクエリを軽量化

---

## ディレクトリ構成

```
rateit-her/
├── app/
│   └── [locale]/               # ja（デフォルト）/ en / zh（将来）
│       ├── (auth)/
│       │   ├── login/           # 将来拡張用（MVP時点では不使用）
│       │   └── register/
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
| `/celebrities` | 芸能人一覧・名前検索 | SSR |
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
- 管理画面（MVP中はSupabase Studioで直接登録）
- 自動テスト

---

## 対象芸能人カテゴリ

- 日本人女優（`actress`）
- ハリウッド女優（`actress`）
- モデル（`model`）
- AV女優（`av_actress`）
