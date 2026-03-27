import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import { EvaluationTabs } from '@/components/profile/EvaluationTabs'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/ja/profile',
  useSearchParams: () => new URLSearchParams(),
}))

const mockEvaluations = [
  {
    id: 1,
    session_id: 'test',
    celebrity_id: 1,
    type_vote: 'cute' as const,
    score: 4.5,
    created_at: '',
    updated_at: '',
    celebrity_name: '田中花子',
    celebrity_image_url: null,
  },
  {
    id: 2,
    session_id: 'test',
    celebrity_id: 2,
    type_vote: 'sexy' as const,
    score: 3.0,
    created_at: '',
    updated_at: '',
    celebrity_name: '鈴木一郎',
    celebrity_image_url: null,
  },
]

describe('EvaluationTabs', () => {
  it('Cute / Sexy / Cool タブが表示される', () => {
    render(<EvaluationTabs evaluations={mockEvaluations} />)
    expect(screen.getByRole('tab', { name: 'Cute' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sexy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cool' })).toBeInTheDocument()
  })

  it('Cute タブに cute 評価が表示される', () => {
    render(<EvaluationTabs evaluations={mockEvaluations} />)
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('評価が空の場合は空状態メッセージが表示される', () => {
    render(<EvaluationTabs evaluations={[]} />)
    expect(screen.getByText(/まだ評価した芸能人がいません/)).toBeInTheDocument()
  })
})
