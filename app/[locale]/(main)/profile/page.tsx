import { getSessionId } from '@/lib/session'
import { getEvaluationsBySession, getTop5BySession } from '@/lib/db/queries/evaluations'
import { EvaluationTabs } from '@/components/profile/EvaluationTabs'
import { Top5List } from '@/components/profile/Top5List'

export default async function ProfilePage() {
  const sessionId = await getSessionId()

  if (!sessionId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">マイページ</h1>
        <p className="text-gray-500">セッションが見つかりません</p>
      </div>
    )
  }

  const [evaluations, top5] = await Promise.all([
    getEvaluationsBySession(sessionId),
    getTop5BySession(sessionId),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">あなたの TOP5</h2>
        <Top5List top5={top5} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">評価履歴</h2>
        <EvaluationTabs evaluations={evaluations} />
      </section>
    </div>
  )
}
