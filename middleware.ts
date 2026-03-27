import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { v4 as uuidv4 } from 'uuid'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'
import { checkRateLimit } from './lib/ratelimit'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // レート制限チェック
  // Server Action は /api/ ではなくページ URL への POST として送信されるため、
  // POST リクエスト全体と /api/ パスを対象にする
  if (
    request.method === 'POST' ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { allowed } = await checkRateLimit(ip)
    if (!allowed) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }

  const response = intlMiddleware(request)

  if (!request.cookies.get(SESSION_COOKIE)) {
    const sessionId = uuidv4()
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
