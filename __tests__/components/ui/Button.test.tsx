import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('ラベルが表示される', () => {
    render(<Button>送信</Button>)
    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument()
  })

  it('クリックで onClick が呼ばれる', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>クリック</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled のとき onClick が呼ばれない', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>ボタン</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('isPending のとき disabled になる', () => {
    render(<Button isPending>送信</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('variant="primary" がデフォルト', () => {
    render(<Button>ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
  })

  it('variant="secondary" が適用される', () => {
    render(<Button variant="secondary">ボタン</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200')
  })
})
