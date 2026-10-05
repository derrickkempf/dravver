// Shared prompt storage (Upstash Redis in production, memory in local dev).
//
//   • Uses Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set
//     (the KV_REST_API_URL / KV_REST_API_TOKEN names Vercel's integration creates also work).
//   • In local dev with no Redis configured, falls back to an in-memory store.
//   • In production it NEVER falls back to memory (serverless instances don't share memory,
//     so a prompt saved on one would be invisible from another). It returns a 503 instead.

import { Redis } from '@upstash/redis'

const STORE_KEY = 'dravver:prompts'

export interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

/** Max prompts WITHOUT a drawing kept in storage. Oldest queued ones are dropped past this. */
export const MAX_UNDRAWN = 500

const seedPrompts: Prompt[] = [
  { id: 'p_001', text: 'sell your sawdust',                    date: '2025-03-18', status: 'done',     drawing: null },
  { id: 'p_002', text: 'build once, sell twice',               date: '2025-03-21', status: 'progress', drawing: null },
  { id: 'p_003', text: 'the moat is the person, not the file', date: '2025-03-23', status: 'queued',   drawing: null },
]

// ── In-memory fallback (dev only) ─────────────────────────────────
let memoryStore: Prompt[] | null = null
function getMemory(): Prompt[] {
  if (memoryStore === null) memoryStore = [...seedPrompts]
  return memoryStore
}
function setMemory(p: Prompt[]) { memoryStore = p }

export const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

function storageError(detail: string) {
  // eslint-disable-next-line no-console
  console.error(`[dravver] storage unavailable: ${detail}`)
  return createError({ statusCode: 503, statusMessage: 'storage not configured', message: detail })
}

let warned = false
function warnDevMemory() {
  if (warned) return
  warned = true
  // eslint-disable-next-line no-console
  console.warn('[dravver] Redis not configured, using in-memory store (dev only).')
}

export async function loadPrompts(): Promise<Prompt[]> {
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

export async function savePrompts(prompts: Prompt[]): Promise<void> {
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

/** Lowercase, strip punctuation and extra spaces: used to spot duplicate prompts. */
export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
}
