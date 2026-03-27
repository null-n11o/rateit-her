import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../helpers/test-utils'
import userEvent from '@testing-library/user-event'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { CelebrityRanking } from '@/types'

// next/navigation をモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ja',
  useSearchParams: () => new URLSearchParams(),
}))

const mockRankings: CelebrityRanking[] = [
  {
    id: 1,
    name: '田中花子',
    category: 'actress',
    image_url: null,
    avg_score: 4.5,
    vote_count: 100,
    dominant_type: 'cute',
    avg_score_cute: 4.5,
    vote_count_cute: 100,
    avg_score_sexy: null,
    vote_count_sexy: 0,
    avg_score_cool: null,
    vote_count_cool: 0,
  },
]

describe('RankingTabs', () => {
  it('4つのタブが表示される', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByRole('tab', { name: '総合' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cute' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sexy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Cool' })).toBeInTheDocument()
  })

  it('activeTab="all" のとき総合タブが選択状態', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByRole('tab', { name: '総合' })).toHaveAttribute('aria-selected', 'true')
  })

  it('all タブでランキングカードが表示される', () => {
    render(
      <RankingTabs
        allRankings={mockRankings}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByText('田中花子')).toBeInTheDocument()
  })

  it('データなしのタブでは "まだ評価がありません" が表示される', () => {
    render(
      <RankingTabs
        allRankings={[]}
        cuteRankings={[]}
        sexyRankings={[]}
        coolRankings={[]}
        activeTab="all"
      />
    )
    expect(screen.getByText('まだ評価がありません')).toBeInTheDocument()
  })
})
