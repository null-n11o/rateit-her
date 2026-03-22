import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { v4 as uuidv4 } from 'uuid'
import { SESSION_COOKIE, SESSION_MAX_AGE } from './lib/session'

const intlMiddleware = createMiddleware(routing)

export function proxy(request: NextRequest) {
  const response = intlMiddleware(request)

  // セッションIDが未発行なら発行する
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
