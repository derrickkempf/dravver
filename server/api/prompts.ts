// server/api/prompts.ts
// GET  — returns all prompts
// POST — adds a new prompt from a visitor
//
// Uses Upstash Redis for persistence (connected via Vercel Storage → Upstash).
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars —
// these are added automatically when you connect Upstash in the Vercel dashboard.

import { Redis } from '@upstash/redis'

const STORE_KEY = 'dravver:prompts'

export interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

const seedPrompts: Prompt[] = [
  { id: 'p_001', text: 'sell your sawdust',                    date: '2025-03-18', status: 'done',     drawing: null },
  { id: 'p_002', text: 'build once, sell twice',               date: '2025-03-21', status: 'progress', drawing: null },
  { id: 'p_003', text: 'the moat is the person, not the file', date: '2025-03-23', status: 'queued',   drawing: null },
]

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export async function load(): Promise<Prompt[]> {
  const redis = getRedis()
  const data = await redis.get<Prompt[]>(STORE_KEY)
  if (!data) {
    await redis.set(STORE_KEY, JSON.stringify(seedPrompts))
    return seedPrompts
  }
  // Upstash auto-parses JSON, but guard either way
  return typeof data === 'string' ? JSON.parse(data) : data
}

export async function save(prompts: Prompt[]): Promise<void> {
  const redis = getRedis()
  await redis.set(STORE_KEY, JSON.stringify(prompts))
}

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return await load()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const text = (body?.text || '').trim()
    if (!text) throw createError({ statusCode: 400, message: 'text required' })

    const prompts = await load()
    const entry: Prompt = {
      id: `p_${Date.now()}`,
      text,
      date: new Date().toISOString().split('T')[0],
      status: 'queued',
      drawing: null,
    }
    prompts.unshift(entry)
    await save(prompts)
    return entry
  }
})
