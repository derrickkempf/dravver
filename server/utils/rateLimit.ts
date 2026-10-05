// Tiny fixed-window rate limiter. Counts live in Upstash Redis (so every serverless
// instance shares them); in local dev they fall back to memory.

import { Redis } from '@upstash/redis'
import { redisConfig } from './promptStore'

const memory = new Map<string, number>()

async function hit(key: string, windowSec: number): Promise<number> {
  const bucket = Math.floor(Date.now() / (windowSec * 1000))
  const k = `dravver:rl:${key}:${bucket}`

  const cfg = redisConfig()
  if (cfg) {
    try {
      const res = await new Redis(cfg).pipeline().incr(k).expire(k, windowSec).exec<[number, number]>()
      return res[0]
    } catch {
      return 0 // if the limiter itself fails, don't lock real visitors out
    }
  }

  if (memory.size > 5000) memory.clear()
  const n = (memory.get(k) ?? 0) + 1
  memory.set(k, n)
  return n
}

export async function rateLimit(key: string, limit: number, windowSec: number) {
  const n = await hit(key, windowSec)
  const retryAfter = windowSec - (Math.floor(Date.now() / 1000) % windowSec)
  return { ok: n <= limit, retryAfter }
}
