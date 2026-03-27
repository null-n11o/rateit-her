import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import * as path from 'path'

export default async function globalTeardown() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
  const sql = neon(process.env.DATABASE_URL!)

  // evaluations は celebrities を FK 参照しているため先に削除する
  await sql`
    DELETE FROM evaluations
    WHERE celebrity_id IN (
      SELECT id FROM celebrities WHERE description = 'E2Eテスト用データ'
    )
  `
  await sql`DELETE FROM celebrities WHERE description = 'E2Eテスト用データ'`
}
