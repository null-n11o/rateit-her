import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { RankingCard } from '@/components/ranking/RankingCard'
import type { CelebrityRanking } from '@/types'

const mockRanking: CelebrityRanking = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  image_url: null,
  avg_score: 4.5,
  vote_count: 100,
  dominant_type: 'cute',
  avg_score_cute: 4.5,
  vote_count_cute: 80,
  avg_score_sexy: 3.0,
  vote_count_sexy: 15,
  avg_score_cool: 2.5,
  vote_count_cool: 5,
}

describe('RankingCard', () => {
  it('芸能人の名前が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('順位が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('1位')).toBeInTheDocument()
  })

  it('平均スコアが表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('投票数が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('100票')).toBeInTheDocument()
  })

  it('dominant_type が表示される', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    expect(screen.getByText('Cute')).toBeInTheDocument()
  })

  it('芸能人プロフィールへのリンクを持つ', () => {
    render(<RankingCard ranking={mockRanking} rank={1} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/celebrities/1'))
  })
})
