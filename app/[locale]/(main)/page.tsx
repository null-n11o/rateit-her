import { getRankings } from '@/lib/db/queries/celebrities'
import { RankingTabs } from '@/components/ranking/RankingTabs'
import type { TypeVote } from '@/types'

interface HomePageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { tab } = await searchParams
  const activeTab = (['cute', 'sexy', 'cool'] as TypeVote[]).includes(tab as TypeVote)
    ? (tab as TypeVote)
    : 'all'

  const [allRankings, cuteRankings, sexyRankings, coolRankings] = await Promise.all([
    getRankings('all'),
    getRankings('cute'),
    getRankings('sexy'),
    getRankings('cool'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ランキング</h1>
      <RankingTabs
        allRankings={allRankings}
        cuteRankings={cuteRankings}
        sexyRankings={sexyRankings}
        coolRankings={coolRankings}
        activeTab={activeTab}
      />
    </div>
  )
}
