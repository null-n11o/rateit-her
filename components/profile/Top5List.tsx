'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import type { Evaluation } from '@/types'

type EvaluationWithCelebrity = Evaluation & {
  celebrity_name: string
  celebrity_image_url: string | null
}

interface Top5ListProps {
  top5: EvaluationWithCelebrity[]
}

export function Top5List({ top5 }: Top5ListProps) {
  if (top5.length === 0) return null
  const locale = useLocale()

  return (
    <ol>
      {top5.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
          <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
          <Link
            href={`/${locale}/celebrities/${item.celebrity_id}`}
            className="flex-1 font-medium hover:text-blue-600"
          >
            {item.celebrity_name}
          </Link>
          <span className="font-bold text-blue-600">{item.score}</span>
        </li>
      ))}
    </ol>
  )
}
