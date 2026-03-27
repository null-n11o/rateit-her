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

function getQuery(callIndex = 0): string {
  const parts = vi.mocked(sql).mock.calls[callIndex][0] as unknown as string[]
  return parts.join('')
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
    const query = getQuery()
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
    const query = getQuery()
    expect(query).toContain('ON CONFLICT')
    expect(query).toContain('DO UPDATE SET')
    expect(query).toContain('updated_at = NOW()')
  })
})
