import { sql } from '../client'
import type { Celebrity, CelebrityRanking, TypeVote } from '@/types'

export async function getCelebrities(search?: string): Promise<Celebrity[]> {
  if (search) {
    return sql`
      SELECT * FROM celebrities
      WHERE name ILIKE ${'%' + search + '%'}
      ORDER BY name ASC
    ` as unknown as Promise<Celebrity[]>
  }
  return sql`SELECT * FROM celebrities ORDER BY name ASC` as unknown as Promise<Celebrity[]>
}

export async function getCelebrityById(id: number): Promise<Celebrity | null> {
  const rows = await sql`SELECT * FROM celebrities WHERE id = ${id}` as unknown as Celebrity[]
  return rows[0] ?? null
}

export async function getRankings(tab: 'all' | TypeVote, limit = 50): Promise<CelebrityRanking[]> {
  // @neondatabase/serverless はカラム名の動的補間をサポートしないため、明示的に分岐する
  if (tab === 'all') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count > 0
      ORDER BY avg_score DESC NULLS LAST
      LIMIT ${limit}
    ` as unknown as Promise<CelebrityRanking[]>
  }
  if (tab === 'cute') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count_cute > 0
      ORDER BY avg_score_cute DESC NULLS LAST
      LIMIT ${limit}
    ` as unknown as Promise<CelebrityRanking[]>
  }
  if (tab === 'sexy') {
    return sql`
      SELECT * FROM celebrity_rankings
      WHERE vote_count_sexy > 0
      ORDER BY avg_score_sexy DESC NULLS LAST
      LIMIT ${limit}
    ` as unknown as Promise<CelebrityRanking[]>
  }
  // cool
  return sql`
    SELECT * FROM celebrity_rankings
    WHERE vote_count_cool > 0
    ORDER BY avg_score_cool DESC NULLS LAST
    LIMIT ${limit}
  ` as unknown as Promise<CelebrityRanking[]>
}

export async function getCelebrityRanking(id: number): Promise<CelebrityRanking | null> {
  const rows = await sql`
    SELECT * FROM celebrity_rankings WHERE id = ${id}
  ` as unknown as CelebrityRanking[]
  return rows[0] ?? null
}
