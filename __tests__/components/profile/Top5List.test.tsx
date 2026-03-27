import { describe, it, expect } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { Top5List } from '@/components/profile/Top5List'
import type { Evaluation } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

const mockTop5: EvaluationWithCelebrity[] = [
  {
    id: 1,
    session_id: 'test',
    celebrity_id: 1,
    type_vote: 'cute',
    score: 5.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '1位の人',
    celebrity_image_url: null,
  },
  {
    id: 2,
    session_id: 'test',
    celebrity_id: 2,
    type_vote: 'sexy',
    score: 4.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '2位の人',
    celebrity_image_url: null,
  },
]

describe('Top5List', () => {
  it('TOP5 の芸能人が表示される', () => {
    render(<Top5List top5={mockTop5} />)
    expect(screen.getByText('1位の人')).toBeInTheDocument()
    expect(screen.getByText('2位の人')).toBeInTheDocument()
  })

  it('スコアが表示される', () => {
    render(<Top5List top5={mockTop5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('空の場合は何も表示されない（または空状態）', () => {
    render(<Top5List top5={[]} />)
    expect(screen.queryByRole('list')).toBeNull()
  })
})
