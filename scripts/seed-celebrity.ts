import { sql } from '@/lib/db/client'
import { fetchWikipediaSummary } from '@/lib/wikipedia/client'
import type { Category } from '@/types'

interface SeedCelebrityOptions {
  slug: string
  category: Category
  name?: string // 省略時は slug をそのまま name に使用
}

export async function seedCelebrity({
  slug,
  category,
  name,
}: SeedCelebrityOptions): Promise<{ id: number }> {
  const summary = await fetchWikipediaSummary(slug)
  if (!summary) {
    throw new Error('Wikipedia に該当するページが見つかりません')
  }

  const celebrityName = name ?? slug
  const rows = await sql`
    INSERT INTO celebrities (name, category, description, image_url, wikipedia_slug)
    VALUES (${celebrityName}, ${category}, ${summary.description}, ${summary.imageUrl}, ${slug})
    RETURNING id
  ` as { id: number }[]

  return rows[0]
}

// CLI エントリポイント
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2)
  const slugIndex = args.indexOf('--slug')
  const categoryIndex = args.indexOf('--category')
  const nameIndex = args.indexOf('--name')

  if (slugIndex === -1 || categoryIndex === -1) {
    console.error('Usage: npx tsx scripts/seed-celebrity.ts --slug <slug> --category <category> [--name <name>]')
    process.exit(1)
  }

  const slug = args[slugIndex + 1]
  const category = args[categoryIndex + 1] as Category
  const name = nameIndex !== -1 ? args[nameIndex + 1] : undefined

  seedCelebrity({ slug, category, name })
    .then(({ id }) => console.log(`登録完了 (id: ${id})`))
    .catch((err) => {
      console.error('エラー:', err.message)
      process.exit(1)
    })
}
