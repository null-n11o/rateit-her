import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLimit = vi.hoisted(() => vi.fn())

// @upstash/redis をモック（new Redis() が使えるよう function を使う）
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function () { return {} }),
}))

// @upstash/ratelimit をモック（slidingWindow 静的メソッドも含む）
vi.mock('@upstash/ratelimit', () => {
  const RatelimitMock = vi.fn(function () {
    return { limit: mockLimit }
  })
  RatelimitMock.slidingWindow = vi.fn().mockReturnValue({})
  return { Ratelimit: RatelimitMock }
})

import { checkRateLimit } from '@/lib/ratelimit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    mockLimit.mockReset()
  })

  it('制限内のリクエストは { allowed: true } を返す', async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 25 })
    const result = await checkRateLimit('127.0.0.1')
    expect(result.allowed).toBe(true)
  })

  it('制限超過のリクエストは { allowed: false } を返す', async () => {
    mockLimit.mockResolvedValue({ success: false, remaining: 0 })
    const result = await checkRateLimit('127.0.0.1')
    expect(result.allowed).toBe(false)
  })
})
