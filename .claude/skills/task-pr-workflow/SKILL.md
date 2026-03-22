---
name: task-pr-workflow
description: Use when completing any implementation task in this project - creates a feature branch, commits, pushes, and opens a detailed GitHub PR. Required after every task in the subagent-driven development flow.
---

# Task → PR ワークフロー

## 概要

タスク完了後に必ず実行する一連のGit操作。コード実装が終わった直後、次のタスクに進む前に必ず行う。

**このスキルをスキップすることは絶対に禁止。**

## フロー

```
タスク完了
  ↓
フィーチャーブランチ作成 (git checkout -b task/NN-short-name)
  ↓
ビルド確認 (npm run build または npx tsc --noEmit)
  ↓
ステージング (git add <関連ファイルのみ>)
  ↓
コミット (git commit -m "feat: ...")
  ↓
プッシュ (git push origin task/NN-short-name)
  ↓
PR作成 (gh pr create --title ... --body ...)
  ↓
次のタスクへ
```

## ブランチ命名規則

```
task/NN-short-description
```

例: `task/07-ranking-page`, `task/12-rate-limit`

- `NN` は2桁のタスク番号
- `short-description` は英語ケバブケース

## ビルド確認

PR作成前に必ずビルドが通ることを確認する。

```bash
npm run build
```

エラーがあれば修正してからコミット。

## コミットメッセージ

```
feat: <タスクの内容を一行で>
```

例:
- `feat: add ranking page with tabs`
- `feat: add evaluation server action with zod validation`

## PR 作成コマンド

```bash
gh pr create \
  --title "feat: Task NN - <タスク名>" \
  --body "$(cat <<'EOF'
<PR本文>
EOF
)"
```

## PR 本文のフォーマット（必須）

PRの本文は以下のセクションをすべて含むこと。**箇条書きだけの薄い内容は禁止。**

```markdown
## 概要
このPRが何をするか1〜3文で説明。「なぜ」この変更が必要かを含める。

## 変更内容

### ファイル名.tsx
- 何を実装したか（WHYを含む）
- 非自明な実装の理由
- 依存関係や前提条件

### 別のファイル名.ts
- ...

## 設計判断
自明でない選択肢について、なぜそうしたかを説明する。
例: 「〜のため、AではなくBを採用した」

## レビューポイント
- 特に見てほしい箇所
- 潜在的な問題点や懸念事項
- 今後変更が必要になりそうな箇所

## テスト
- [x] npm run build が通ること
- [ ] （手動確認が必要な項目）
```

## 実際の例

```bash
gh pr create \
  --title "feat: Task 7 - ランキングページ" \
  --body "$(cat <<'EOF'
## 概要
トップページ（/ja）にランキング表示機能を実装します。総合・Cute・Sexy・Coolの4タブでフィルタリングでき、DBのVIEW（celebrity_rankings）から集計済みデータを取得して表示します。

## 変更内容

### components/ranking/RankingCard.tsx
- 芸能人1件分のランキングカードを表示するServer Component
- 画像はnext/imageを使用（Wikimediaドメインはnext.config.tsで許可済み）
- 画像なし時は「No img」プレースホルダーを表示（celebrity登録時に画像がない場合を考慮）

### components/ranking/RankingTabs.tsx
- Client Component。useRouter + usePathnameでタブ切り替え時にURLのsearchParamsを更新
- searchParamsベースのナビゲーションにしたのは、SSRでタブ状態を保持しつつURLで共有可能にするため

### app/[locale]/(main)/page.tsx
- Server Component。searchParams.tab でタブを受け取りgetRankings()を呼ぶ
- 不正なtab値はvalidTabで'all'にフォールバック

## 設計判断
タブのアクティブ状態をURLのsearchParams（?tab=cute）で管理しています。
クライアントstateで持つ案もありましたが、URLで状態が共有できること・ページリロード後も状態が保持されることを優先しました。

## レビューポイント
- RankingTabsでのrouter.push呼び出しはフルページ遷移ではなくClient-side navigationになることを確認済み
- vote_countが0のレコードはVIEW側のWHERE句で除外しているためカードには表示されない

## テスト
- [x] npm run build が通ること
- [ ] /ja で4タブが表示されてフィルタが動作すること（手動確認）
EOF
)"
```

## やってはいけないこと

- **mainブランチに直接コミットしない**（Task 4のみ例外、以降は必ずブランチを切る）
- **PRの本文を箇条書きだけにしない**（設計判断・レビューポイントが必須）
- **ビルド確認をスキップしない**
- **実装完了してからPRを後回しにしない**（タスクとPR作成はセット）
