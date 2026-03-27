import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  const sql = neon(process.env.DATABASE_URL!)

  // テスト芸能人を upsert（名前で識別）
  await sql`
    INSERT INTO celebrities (name, category, description)
    VALUES
      ('E2Eテスト女優A', 'actress', 'E2Eテスト用データ'),
      ('E2Eテストモデル', 'model', 'E2Eテスト用データ')
    ON CONFLICT DO NOTHING
  `
}
