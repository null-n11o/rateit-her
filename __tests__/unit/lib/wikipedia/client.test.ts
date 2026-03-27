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
