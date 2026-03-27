'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RankingCard } from './RankingCard'
import type { CelebrityRanking, TypeVote } from '@/types'

type Tab = 'all' | TypeVote

interface RankingTabsProps {
  allRankings: CelebrityRanking[]
  cuteRankings: CelebrityRanking[]
  sexyRankings: CelebrityRanking[]
  coolRankings: CelebrityRanking[]
  activeTab: Tab
}

export function RankingTabs({
  allRankings,
  cuteRankings,
  sexyRankings,
  coolRankings,
  activeTab,
}: RankingTabsProps) {
  const t = useTranslations('ranking')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabs: { key: Tab; label: string; rankings: CelebrityRanking[] }[] = [
    { key: 'all', label: t('tabs.all'), rankings: allRankings },
    { key: 'cute', label: t('tabs.cute'), rankings: cuteRankings },
    { key: 'sexy', label: t('tabs.sexy'), rankings: sexyRankings },
    { key: 'cool', label: t('tabs.cool'), rankings: coolRankings },
  ]

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const activeRankings = tabs.find((t) => t.key === activeTab)?.rankings ?? []

  return (
    <div>
      <div role="tablist" className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {activeRankings.length === 0 ? (
          <p className="text-center text-gray-400 py-8">{t('noData')}</p>
        ) : (
          activeRankings.map((ranking, index) => (
            <RankingCard key={ranking.id} ranking={ranking} rank={index + 1} />
          ))
        )}
      </div>
    </div>
  )
}
