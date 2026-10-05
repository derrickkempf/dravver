// server/api/prompts.ts
// GET  — returns all prompts
// POST — adds a new prompt from a visitor
//
// Persistence:
//   • Uses Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set
//     (the KV_REST_API_URL / KV_REST_API_TOKEN names Vercel's Upstash integration creates also work).
//   • In local dev with no Redis configured, falls back to an in-memory store.
//   • In production it NEVER falls back to memory. Serverless instances don't share memory, so
//     a prompt saved on one instance would be invisible from another (e.g. phone vs desktop).
//     Instead the API returns a 503 so the problem is loud instead of silent.

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
// Dev only. In production the store must be Redis (see header comment).
let memoryStore: Prompt[] | null = null
function getMemory(): Prompt[] {
  if (memoryStore === null) memoryStore = [...seedPrompts]
  return memoryStore
}
function setMemory(p: Prompt[]) { memoryStore = p }

const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

function storageError(detail: string) {
  // eslint-disable-next-line no-console
  console.error(`[dravver] storage unavailable: ${detail}`)
  return createError({
    statusCode: 503,
    statusMessage: 'storage not configured',
    message: detail,
  })
}

let warned = false
function warnDevMemory() {
  if (warned) return
  warned = true
  // eslint-disable-next-line no-console
  console.warn('[dravver] Redis not configured, using in-memory store (dev only).')
}

export async function load(): Promise<Prompt[]> {
  const cfg = redisConfig()
  if (!cfg) {
    if (IS_PROD) throw storageError('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the Vercel project env vars.')
    warnDevMemory()
    return getMemory()
  }
  try {
    const redis = new Redis(cfg)
    const data = await redis.get<Prompt[]>(STORE_KEY)
    if (data === null || data === undefined) {
      await redis.set(STORE_KEY, JSON.stringify(seedPrompts))
      return seedPrompts
    }
    return typeof data === 'string' ? JSON.parse(data) : data
  } catch (err) {
    if (IS_PROD) throw storageError(`Redis request failed: ${(err as Error).message ?? err}`)
    warnDevMemory()
    return getMemory()
  }
}

export async function save(prompts: Prompt[]): Promise<void> {
  const cfg = redisConfig()
  if (!cfg) {
    if (IS_PROD) throw storageError('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the Vercel project env vars.')
    warnDevMemory()
    setMemory(prompts)
    return
  }
  try {
    const redis = new Redis(cfg)
    await redis.set(STORE_KEY, JSON.stringify(prompts))
  } catch (err) {
    if (IS_PROD) throw storageError(`Redis request failed: ${(err as Error).message ?? err}`)
    warnDevMemory()
    setMemory(prompts)
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method
  setHeader(event, 'Cache-Control', 'no-store')

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
