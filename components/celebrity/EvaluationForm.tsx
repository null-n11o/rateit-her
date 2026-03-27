'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { evaluateAction, type EvaluateResult } from '@/lib/actions/evaluate'
import { Button } from '@/components/ui/Button'
import type { Evaluation, TypeVote } from '@/types'

interface EvaluationFormProps {
  celebrityId: number
  initialEvaluation: Evaluation | null
}

const TYPE_LABELS: Record<TypeVote, string> = {
  cute: 'Cute',
  sexy: 'Sexy',
  cool: 'Cool',
}

export function EvaluationForm({ celebrityId, initialEvaluation }: EvaluationFormProps) {
  const t = useTranslations('celebrity')
  const [state, formAction, isPending] = useActionState<EvaluateResult | null, FormData>(
    evaluateAction,
    null
  )
  const [selectedType, setSelectedType] = useState<TypeVote | null>(
    initialEvaluation?.type_vote ?? null
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="celebrity_id" value={celebrityId} />
      <input type="hidden" name="type_vote" value={selectedType ?? ''} />

      <div>
        <p className="text-sm font-medium mb-2">{t('typeVote.cute')} / {t('typeVote.sexy')} / {t('typeVote.cool')}</p>
        <div className="flex gap-2">
          {(['cute', 'sexy', 'cool'] as TypeVote[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selectedType === type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">
          スコア（1.0 〜 5.0）
        </label>
        <input
          type="number"
          name="score"
          min="1.0"
          max="5.0"
          step="0.1"
          defaultValue={initialEvaluation?.score ?? 3.0}
          className="border border-gray-300 rounded-lg px-3 py-2 w-24"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">{t('updated')}</p>
      )}

      <Button type="submit" isPending={isPending}>
        {t('submit')}
      </Button>
    </form>
  )
}
