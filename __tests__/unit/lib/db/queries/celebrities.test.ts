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

// sql はタグ付きテンプレートリテラル関数のため、mock.calls[0][0] は TemplateStringsArray (配列)
// 各パーツを join して SQL 文字列として検証する
function getQuery(callIndex = 0): string {
  const parts = vi.mocked(sql).mock.calls[callIndex][0] as unknown as string[]
  return parts.join('')
}

describe('getCelebrities', () => {
  beforeEach(() => vi.clearAllMocks())

  it('検索なしで全件を名前順で返す', async () => {
    vi.mocked(sql).mockResolvedValue([mockCelebrity] as never)
    const result = await getCelebrities()
    expect(result).toEqual([mockCelebrity])
    expect(getQuery()).toContain('ORDER BY name ASC')
  })

  it('検索クエリがある場合は ILIKE でフィルタする', async () => {
    vi.mocked(sql).mockResolvedValue([mockCelebrity] as never)
    await getCelebrities('花子')
    expect(getQuery()).toContain('ILIKE')
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
    const query = getQuery()
    expect(query).toContain('avg_score')
    expect(query).toContain('vote_count > 0')
  })

  it('cute タブは avg_score_cute で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([mockRanking] as never)
    await getRankings('cute')
    const query = getQuery()
    expect(query).toContain('avg_score_cute')
    expect(query).toContain('vote_count_cute > 0')
  })

  it('sexy タブは avg_score_sexy で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('sexy')
    expect(getQuery()).toContain('avg_score_sexy')
  })

  it('cool タブは avg_score_cool で ORDER BY する', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('cool')
    expect(getQuery()).toContain('avg_score_cool')
  })

  it('デフォルトの limit は 50', async () => {
    vi.mocked(sql).mockResolvedValue([] as never)
    await getRankings('all')
    expect(getQuery()).toContain('LIMIT')
  })
})
