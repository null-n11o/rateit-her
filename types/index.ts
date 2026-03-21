export type TypeVote = 'cute' | 'sexy' | 'cool'
export type Category = 'actress' | 'model' | 'av_actress'

export interface Celebrity {
  id: number
  name: string
  description: string | null
  category: Category
  image_url: string | null
  wikipedia_slug: string | null
  created_at: string
}

export interface CelebrityRanking {
  id: number
  name: string
  category: Category
  image_url: string | null
  avg_score: number | null
  vote_count: number
  dominant_type: TypeVote | null
  avg_score_cute: number | null
  vote_count_cute: number
  avg_score_sexy: number | null
  vote_count_sexy: number
  avg_score_cool: number | null
  vote_count_cool: number
}

export interface Evaluation {
  id: number
  session_id: string
  celebrity_id: number
  type_vote: TypeVote
  score: number
  created_at: string
  updated_at: string
}
