import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-500 mb-6">ページが見つかりません</p>
      <Link href="/" className="text-pink-500 hover:underline">ホームへ戻る</Link>
    </div>
  )
}
