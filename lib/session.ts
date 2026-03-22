import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'session_id'
export const SESSION_MAX_AGE = 365 * 24 * 60 * 60 // 1年（秒）

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}
