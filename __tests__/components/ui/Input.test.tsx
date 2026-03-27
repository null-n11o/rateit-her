import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('placeholder が表示される', () => {
    render(<Input placeholder="検索..." />)
    expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument()
  })

  it('入力値が変わると onChange が呼ばれる', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'テスト')
    expect(onChange).toHaveBeenCalled()
  })

  it('label が指定された場合に表示される', () => {
    render(<Input label="名前" />)
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
  })
})
