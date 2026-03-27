export interface WikipediaSummary {
  description: string
  imageUrl: string | null
}

export async function fetchWikipediaSummary(
  slug: string
): Promise<WikipediaSummary | null> {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'RateItHer/1.0' },
    next: { revalidate: 86400 }, // 24h cache
  })

  if (!response.ok) return null

  const data = await response.json()
  return {
    description: data.extract ?? '',
    imageUrl: data.thumbnail?.source ?? null,
  }
}
