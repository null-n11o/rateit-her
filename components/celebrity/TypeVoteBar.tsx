import type { CelebrityRanking, TypeVote } from '@/types'

interface TypeVoteBarProps {
  ranking: CelebrityRanking
}

const TYPE_LABELS: Record<TypeVote, string> = {
  cute: 'Cute',
  sexy: 'Sexy',
  cool: 'Cool',
}

export function TypeVoteBar({ ranking }: TypeVoteBarProps) {
  const total = ranking.vote_count || 1
  const types: { key: TypeVote; count: number }[] = [
    { key: 'cute', count: ranking.vote_count_cute },
    { key: 'sexy', count: ranking.vote_count_sexy },
    { key: 'cool', count: ranking.vote_count_cool },
  ]

  return (
    <div className="flex flex-col gap-2">
      {types.map(({ key, count }) => {
        const pct = Math.round((count / total) * 100)
        const isDominant = ranking.dominant_type === key

        return (
          <div
            key={key}
            data-dominant={isDominant ? 'true' : undefined}
            className={`flex items-center gap-3 p-2 rounded-lg ${isDominant ? 'bg-blue-50' : ''}`}
          >
            <span className={`text-sm font-medium w-10 ${isDominant ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
              {TYPE_LABELS[key]}
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isDominant ? 'bg-blue-500' : 'bg-gray-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12 text-right">{count}票</span>
          </div>
        )
      })}
    </div>
  )
}
