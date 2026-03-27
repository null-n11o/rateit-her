'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import type { Evaluation, TypeVote } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface EvaluationTabsProps {
  evaluations: EvaluationWithCelebrity[]
}

const TABS: { key: TypeVote; label: string }[] = [
  { key: 'cute', label: 'Cute' },
  { key: 'sexy', label: 'Sexy' },
  { key: 'cool', label: 'Cool' },
]

export function EvaluationTabs({ evaluations }: EvaluationTabsProps) {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<TypeVote>('cute')

  const filtered = evaluations.filter((e) => e.type_vote === activeTab)

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('empty')}</p>
        <Link href={`/${locale}`} className="text-blue-600 underline mt-2 inline-block">
          {t('goToRanking')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div role="tablist" className="flex border-b mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">評価なし</p>
        ) : (
          filtered.map((evaluation) => (
            <Link
              key={evaluation.id}
              href={`/${locale}/celebrities/${evaluation.celebrity_id}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
            >
              <span className="font-medium">{evaluation.celebrity_name}</span>
              <span className="ml-auto text-blue-600 font-bold">{evaluation.score}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
