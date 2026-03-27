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
