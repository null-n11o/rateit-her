'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { upsertEvaluation } from '@/lib/db/queries/evaluations'

export type EvaluateResult = { success: true } | { success: false; error: string }

const evaluateSchema = z.object({
  celebrity_id: z.number().int().positive(),
  type_vote: z.enum(['cute', 'sexy', 'cool']),
  score: z.number().min(1.0).max(5.0),
})

// テスト可能な純粋ロジック（Server Action から分離）
export async function processEvaluation(
  sessionId: string,
  input: unknown
): Promise<EvaluateResult> {
  const parsed = evaluateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'バリデーションエラー' }
  }

  // 浮動小数点誤差を回避するため 0.1 刻みで丸める
  const score = Math.round(parsed.data.score * 10) / 10

  try {
    await upsertEvaluation({
      sessionId,
      celebrityId: parsed.data.celebrity_id,
      typeVote: parsed.data.type_vote,
      score,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'サーバーエラーが発生しました' }
  }
}

// Next.js Server Action（薄いラッパー）
export async function evaluateAction(
  _: EvaluateResult | null,
  formData: FormData
): Promise<EvaluateResult> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    return { success: false, error: 'セッションが見つかりません' }
  }
  return processEvaluation(sessionId, {
    celebrity_id: Number(formData.get('celebrity_id')),
    type_vote: formData.get('type_vote'),
    score: Number(formData.get('score')),
  })
}
