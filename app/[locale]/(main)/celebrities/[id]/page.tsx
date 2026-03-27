import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getCelebrityById, getCelebrityRanking } from '@/lib/db/queries/celebrities'
import { getEvaluationBySession } from '@/lib/db/queries/evaluations'
import { getSessionId } from '@/lib/session'
import { TypeVoteBar } from '@/components/celebrity/TypeVoteBar'
import { EvaluationForm } from '@/components/celebrity/EvaluationForm'

interface CelebrityPageProps {
  params: Promise<{ id: string }>
}

export default async function CelebrityPage({ params }: CelebrityPageProps) {
  const { id } = await params
  const celebrityId = Number(id)

  if (!Number.isInteger(celebrityId) || celebrityId <= 0) {
    notFound()
  }

  const [celebrity, ranking] = await Promise.all([
    getCelebrityById(celebrityId),
    getCelebrityRanking(celebrityId),
  ])

  if (!celebrity) notFound()

  const sessionId = await getSessionId()
  const myEvaluation = sessionId
    ? await getEvaluationBySession(sessionId, celebrityId)
    : null

  return (
    <div className="max-w-2xl">
      <div className="flex gap-6 mb-8">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 shrink-0">
          {celebrity.image_url && (
            <Image
              src={celebrity.image_url}
              alt={celebrity.name}
              fill
              className="object-cover"
            />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{celebrity.name}</h1>
          <p className="text-sm text-gray-500 capitalize mt-1">{celebrity.category}</p>
          {celebrity.description && (
            <p className="text-sm text-gray-600 mt-2">{celebrity.description}</p>
          )}
        </div>
      </div>

      {ranking && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">みんなの評価</h2>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold">
              {ranking.avg_score?.toFixed(1) ?? '-'}
            </span>
            <span className="text-gray-500">{ranking.vote_count}票</span>
          </div>
          <TypeVoteBar ranking={ranking} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {myEvaluation ? 'あなたの評価' : '評価する'}
        </h2>
        <EvaluationForm celebrityId={celebrityId} initialEvaluation={myEvaluation} />
      </section>
    </div>
  )
}
