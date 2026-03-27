import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { TypeVoteBar } from '@/components/celebrity/TypeVoteBar'
import type { CelebrityRanking } from '@/types'

const mockRanking: CelebrityRanking = {
  id: 1,
  name: '田中花子',
  category: 'actress',
  image_url: null,
  avg_score: 4.0,
  vote_count: 100,
  dominant_type: 'cute',
  avg_score_cute: 4.5,
  vote_count_cute: 60,
  avg_score_sexy: 3.5,
  vote_count_sexy: 30,
  avg_score_cool: 3.0,
  vote_count_cool: 10,
}

describe('TypeVoteBar', () => {
  it('3種類のタイプが表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    expect(screen.getByText('Cute')).toBeInTheDocument()
    expect(screen.getByText('Sexy')).toBeInTheDocument()
    expect(screen.getByText('Cool')).toBeInTheDocument()
  })

  it('票数が表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    expect(screen.getByText('60票')).toBeInTheDocument()
    expect(screen.getByText('30票')).toBeInTheDocument()
    expect(screen.getByText('10票')).toBeInTheDocument()
  })

  it('dominant_type の Cute が強調表示される', () => {
    render(<TypeVoteBar ranking={mockRanking} />)
    const cuteSection = screen.getByText('Cute').closest('[data-dominant]')
    expect(cuteSection).not.toBeNull()
  })
})
