import Link from 'next/link'
import Image from 'next/image'
import { getCelebrities } from '@/lib/db/queries/celebrities'
import { Input } from '@/components/ui/Input'
import { getLocale } from 'next-intl/server'

interface CelebritiesPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function CelebritiesPage({ searchParams }: CelebritiesPageProps) {
  const { q } = await searchParams
  const [celebrities, locale] = await Promise.all([
    getCelebrities(q),
    getLocale(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">芸能人一覧</h1>

      <form className="mb-6">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="名前で検索..."
          className="max-w-sm"
        />
      </form>

      {celebrities.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          該当する芸能人が見つかりません
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {celebrities.map((celebrity) => (
            <Link
              key={celebrity.id}
              href={`/${locale}/celebrities/${celebrity.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                {celebrity.image_url && (
                  <Image
                    src={celebrity.image_url}
                    alt={celebrity.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <p className="text-sm font-medium text-center truncate w-full">
                {celebrity.name}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
