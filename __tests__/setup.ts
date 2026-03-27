import '@testing-library/jest-dom/vitest'

// テスト用環境変数（モック時に module が throw しないよう設定）
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
