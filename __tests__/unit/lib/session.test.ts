import { describe, it, expect, vi } from 'vitest'

const mockGet = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}))

import { getSessionId, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'

describe('getSessionId', () => {
  it('Cookie に session_id がある場合はその値を返す', async () => {
    mockGet.mockReturnValue({ value: 'test-uuid-1234' })
    const result = await getSessionId()
    expect(result).toBe('test-uuid-1234')
    expect(mockGet).toHaveBeenCalledWith(SESSION_COOKIE)
  })

  it('Cookie に session_id がない場合は null を返す', async () => {
    mockGet.mockReturnValue(undefined)
    const result = await getSessionId()
    expect(result).toBeNull()
  })
})

describe('SESSION_MAX_AGE', () => {
  it('1年分の秒数（31536000）', () => {
    expect(SESSION_MAX_AGE).toBe(365 * 24 * 60 * 60)
  })
})
