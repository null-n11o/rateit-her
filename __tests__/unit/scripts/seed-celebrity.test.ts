import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({ sql: vi.fn() }))
vi.mock('@/lib/wikipedia/client', () => ({
  fetchWikipediaSummary: vi.fn(),
}))

import { sql } from '@/lib/db/client'
import { fetchWikipediaSummary } from '@/lib/wikipedia/client'
import { seedCelebrity } from '@/scripts/seed-celebrity'

function getQuery(callIndex = 0): string {
  const parts = vi.mocked(sql).mock.calls[callIndex][0] as unknown as string[]
  return parts.join('')
}

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
    expect(getQuery()).toContain('INSERT INTO celebrities')
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

    expect(getQuery()).toContain('INSERT INTO celebrities')
  })
})
