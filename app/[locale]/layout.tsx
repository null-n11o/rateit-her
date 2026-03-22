import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

export const metadata: Metadata = {
  title: 'RateIt Her',
  description: '芸能人を評価・ランキングするサイト',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'ja' | 'en' | 'zh')) {
    notFound()
  }
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <header className="border-b px-4 py-3">
            <a href={`/${locale}`} className="font-bold text-lg">RateIt Her</a>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-6">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
