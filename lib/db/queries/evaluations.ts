import { sql } from '../client'
import type { Evaluation, TypeVote } from '@/types'

export async function getEvaluationBySession(
  sessionId: string,
  celebrityId: number
): Promise<Evaluation | null> {
  const rows = await sql`
    SELECT * FROM evaluations
    WHERE session_id = ${sessionId}::uuid AND celebrity_id = ${celebrityId}
  ` as unknown as Evaluation[]
  return rows[0] ?? null
}

export async function getEvaluationsBySession(sessionId: string): Promise<
  (Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]
> {
  return sql`
    SELECT e.*, c.name AS celebrity_name, c.image_url AS celebrity_image_url
    FROM evaluations e
    JOIN celebrities c ON c.id = e.celebrity_id
    WHERE e.session_id = ${sessionId}::uuid
    ORDER BY e.updated_at DESC
  ` as unknown as Promise<(Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]>
}

export async function getTop5BySession(sessionId: string): Promise<
  (Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]
> {
  return sql`
    SELECT e.*, c.name AS celebrity_name, c.image_url AS celebrity_image_url
    FROM evaluations e
    JOIN celebrities c ON c.id = e.celebrity_id
    WHERE e.session_id = ${sessionId}::uuid
    ORDER BY e.score DESC
    LIMIT 5
  ` as unknown as Promise<(Evaluation & { celebrity_name: string; celebrity_image_url: string | null })[]>
}

export async function upsertEvaluation(params: {
  sessionId: string
  celebrityId: number
  typeVote: TypeVote
  score: number
}): Promise<void> {
  const { sessionId, celebrityId, typeVote, score } = params
  await sql`
    INSERT INTO evaluations (session_id, celebrity_id, type_vote, score)
    VALUES (${sessionId}::uuid, ${celebrityId}, ${typeVote}, ${score})
    ON CONFLICT (session_id, celebrity_id)
    DO UPDATE SET
      type_vote  = EXCLUDED.type_vote,
      score      = EXCLUDED.score,
      updated_at = NOW()
  `
}
