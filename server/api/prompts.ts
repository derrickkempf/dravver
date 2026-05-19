// server/api/prompts.ts
// GET  — returns all prompts
// POST — adds a new prompt from a visitor
//
// Persistence:
//   • If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses Upstash Redis.
//   • Otherwise falls back to an in-memory store so the site is usable in dev
//     and so missing env vars surface as a clear warning instead of a 500.

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

// ── In-memory fallback ────────────────────────────────────────────
// Lives for the lifetime of the server instance (per Vercel cold start).
// Plenty good for dev or for a graceful prod fallback while Upstash is wired up.
let memoryStore: Prompt[] | null = null
function getMemory(): Prompt[] {
  if (memoryStore === null) memoryStore = [...seedPrompts]
  return memoryStore
}
function setMemory(p: Prompt[]) { memoryStore = p }

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

let warned = false
function warnNoUpstash(err?: unknown) {
  if (warned) return
  warned = true
  // eslint-disable-next-line no-console
  console.warn(
    '[dravver] Upstash not configured — using in-memory store. ' +
    'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to persist prompts.' +
    (err ? ` (cause: ${(err as Error).message ?? err})` : ''),
  )
}

export async function load(): Promise<Prompt[]> {
  if (!hasUpstash()) {
    warnNoUpstash()
    return getMemory()
  }
  try {
    const redis = getRedis()
    const data = await redis.get<Prompt[]>(STORE_KEY)
    if (data === null || data === undefined) {
      await redis.set(STORE_KEY, JSON.stringify(seedPrompts))
      return seedPrompts
    }
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch (err) {
    warnNoUpstash(err)
    return getMemory()
  }
}

export async function save(prompts: Prompt[]): Promise<void> {
  if (!hasUpstash()) {
    warnNoUpstash()
    setMemory(prompts)
    return
  }
  try {
    const redis = getRedis()
    await redis.set(STORE_KEY, JSON.stringify(prompts))
  } catch (err) {
    warnNoUpstash(err)
    setMemory(prompts)
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return await load()
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const text = (body?.text || '').toString().trim()
    if (!text) throw createError({ statusCode: 400, statusMessage: 'text required' })
    if (text.length > 280) {
      throw createError({ statusCode: 400, statusMessage: 'text too long (max 280)' })
    }

    const prompts = await load()
    const entry: Prompt = {
      id: `p_${Date.now()}`,
      text,
      date: new Date().toISOString(),
      status: 'queued',
      drawing: null,
    }
    prompts.unshift(entry)
    await save(prompts)
    return entry
  }

  throw createError({ statusCode: 405, statusMessage: 'method not allowed' })
})
