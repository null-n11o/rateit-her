import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../../helpers/test-utils'
import userEvent from '@testing-library/user-event'
import { EvaluationForm } from '@/components/celebrity/EvaluationForm'
import type { Evaluation } from '@/types'

// Server Action をモック
vi.mock('@/lib/actions/evaluate', () => ({
  evaluateAction: vi.fn().mockResolvedValue({ success: true }),
}))

describe('EvaluationForm', () => {
  it('タイプ選択ボタンが3つ表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('button', { name: /Cute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sexy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cool/i })).toBeInTheDocument()
  })

  it('スコア入力フィールドが表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('タイプを選択するとボタンが選択状態になる', async () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    await userEvent.click(screen.getByRole('button', { name: /Cute/i }))
    expect(screen.getByRole('button', { name: /Cute/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('既存の評価がある場合は初期値が設定される', () => {
    const existing: Evaluation = {
      id: 1,
      session_id: 'test',
      celebrity_id: 1,
      type_vote: 'sexy',
      score: 3.5,
      created_at: '',
      updated_at: '',
    }
    render(<EvaluationForm celebrityId={1} initialEvaluation={existing} />)
    expect(screen.getByRole('button', { name: /Sexy/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('spinbutton')).toHaveValue(3.5)
  })

  it('送信ボタンが表示される', () => {
    render(<EvaluationForm celebrityId={1} initialEvaluation={null} />)
    expect(screen.getByRole('button', { name: '評価を送信' })).toBeInTheDocument()
  })
})
