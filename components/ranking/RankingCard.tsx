import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { CelebrityRanking } from '@/types'

interface RankingCardProps {
  ranking: CelebrityRanking
  rank: number
}

export function RankingCard({ ranking, rank }: RankingCardProps) {
  const locale = useLocale()
  const t = useTranslations('ranking')

  return (
    <Link
      href={`/${locale}/celebrities/${ranking.id}`}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <span className="text-lg font-bold text-gray-500 w-8 shrink-0">
        {t('rank', { rank })}
      </span>
      <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden bg-gray-200">
        {ranking.image_url && (
          <Image
            src={ranking.image_url}
            alt={ranking.name}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{ranking.name}</p>
        {ranking.dominant_type && (
          <p className="text-sm text-gray-500 capitalize">
            {ranking.dominant_type.charAt(0).toUpperCase() + ranking.dominant_type.slice(1)}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-lg">{ranking.avg_score?.toFixed(1) ?? '-'}</p>
        <p className="text-xs text-gray-400">{t('votes', { count: ranking.vote_count })}</p>
      </div>
    </Link>
  )
}
