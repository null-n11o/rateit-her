import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Ratelimit インスタンスはリクエストごとではなくモジュールレベルで生成
let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit {
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      prefix: 'rateit',
    })
  }
  return ratelimit
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const { success, remaining } = await getRatelimit().limit(ip)
  return { allowed: success, remaining }
}
