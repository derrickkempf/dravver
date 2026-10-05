// server/api/prompts.ts
// GET  — returns prompts (public: newest 50 without a drawing + every drawn one; admins can pass ?all=1)
// POST — adds a new prompt from a visitor, with spam protection

import { createHash } from 'node:crypto'
import { loadPrompts, savePrompts, normalizeText, MAX_UNDRAWN } from '../utils/promptStore'
import type { Prompt } from '../utils/promptStore'
import { rateLimit } from '../utils/rateLimit'
import { isAdmin } from '../utils/adminAuth'

const MAX_CHARS = 280
const PUBLIC_QUEUE_LIMIT = 50          // homepage only ever loads the latest 50 un-drawn prompts
const PER_IP_LIMIT = 5                 // attempts per visitor...
const PER_IP_WINDOW = 10 * 60          // ...per 10 minutes
const GLOBAL_LIMIT = 120               // attempts across everyone...
const GLOBAL_WINDOW = 60 * 60          // ...per hour (last-resort cap against distributed floods)
const MIN_FILL_MS = 1200               // a human can't load the page and submit faster than this

// Links and handles: the usual spam payload. Prompts are short ideas, so we just refuse them.
const LINKISH = /(https?:\/\/|www\.|t\.me\/|@[a-z0-9_]{3,}|\b[a-z0-9-]{2,}\.(com|net|org|io|ru|cn|xyz|top|info|biz|link|site|online|shop|app|dev|click|club|live|store|tech|vip|work|bet|casino|loan)\b)/i

function reject(statusCode: number, message: string) {
  return createError({ statusCode, statusMessage: message, message })
}

function visitorKey(event: Parameters<typeof getRequestIP>[0]): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  // Hash it so raw IP addresses never end up in the database
  return createHash('sha256').update(`${ip}|${useRuntimeConfig().adminSecret}`).digest('hex').slice(0, 24)
}

export default defineEventHandler(async (event) => {
  const method = event.method
  setHeader(event, 'Cache-Control', 'no-store')

  if (method === 'GET') {
    const prompts = await loadPrompts()
    if (getQuery(event).all && isAdmin(event)) return prompts
    let undrawn = 0
    return prompts.filter((p) => (p.drawing ? true : undrawn++ < PUBLIC_QUEUE_LIMIT))
  }

  if (method === 'POST') {
    const body = await readBody(event)

    // 1) Rate limits (cheap, so they run before anything touches the database)
    const perIp = await rateLimit(`ip:${visitorKey(event)}`, PER_IP_LIMIT, PER_IP_WINDOW)
    if (!perIp.ok) {
      const mins = Math.max(1, Math.ceil(perIp.retryAfter / 60))
      setHeader(event, 'Retry-After', String(perIp.retryAfter))
      throw reject(429, `slow down. try again in ${mins} minute${mins === 1 ? '' : 's'}.`)
    }
    const global = await rateLimit('global', GLOBAL_LIMIT, GLOBAL_WINDOW)
    if (!global.ok) {
      setHeader(event, 'Retry-After', String(global.retryAfter))
      throw reject(429, 'the notebook is swamped right now. try again later.')
    }

    // 2) Bot traps: bots fill in the hidden field and submit instantly. Pretend it worked.
    const fillMs = body?.t
    if (typeof fillMs !== 'number' || !Number.isFinite(fillMs)) {
      throw reject(400, 'please reload the page and try again.')
    }
    if ((typeof body?.website === 'string' && body.website.trim() !== '') || fillMs < MIN_FILL_MS) {
      return { id: `p_${Date.now()}`, text: '', date: new Date().toISOString(), status: 'queued', drawing: null }
    }

    // 3) Clean up and validate the text
    const text = (body?.text ?? '')
      .toString()
      .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) throw reject(400, 'text required')
    if (text.length > MAX_CHARS) throw reject(400, `text too long (max ${MAX_CHARS})`)
    if (!/[\p{L}\p{N}]{2,}/u.test(text)) throw reject(400, 'that needs a few more letters.')
    if (LINKISH.test(text)) throw reject(400, "links and handles aren't allowed in prompts.")

    // 4) No duplicates
    const prompts = await loadPrompts()
    const norm = normalizeText(text)
    const dup = prompts.find((p) => normalizeText(p.text) === norm)
    if (dup) {
      throw reject(409, dup.drawing ? "that one's already been drawn. check the Drawn page." : "that one's already in the queue.")
    }

    // 5) Save, trimming the oldest un-drawn prompts if the store is getting huge
    const entry: Prompt = {
      id: `p_${Date.now()}`,
      text,
      date: new Date().toISOString(),
      status: 'queued',
      drawing: null,
    }
    let next = [entry, ...prompts]
    let undrawn = next.filter((p) => !p.drawing).length
    if (undrawn > MAX_UNDRAWN) {
      for (let i = next.length - 1; i >= 0 && undrawn > MAX_UNDRAWN; i--) {
        if (!next[i].drawing && next[i].status === 'queued') { next.splice(i, 1); undrawn-- }
      }
    }
    await savePrompts(next)
    return entry
  }

  throw reject(405, 'method not allowed')
})
