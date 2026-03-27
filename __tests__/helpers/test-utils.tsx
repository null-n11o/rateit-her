import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/messages/ja.json'

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="ja" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
