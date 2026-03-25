// server/api/prompts.ts
// GET  — returns all prompts
// POST — adds a new prompt from a visitor

import defaultPrompts from '../data/prompts.json'

interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

// In-memory store — seeded from the JSON file.
// On Vercel, this resets between cold starts, which is fine for a queue
// that is managed primarily through the admin panel.
// For full persistence, swap this with Vercel KV (see README).
let store: Prompt[] = [...(defaultPrompts as Prompt[])]

export function getStore() { return store }
export function setStore(data: Prompt[]) { store = data }

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return store
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const text = (body?.text || '').trim()
    if (!text) throw createError({ statusCode: 400, message: 'text required' })

    const entry: Prompt = {
      id: `p_${Date.now()}`,
      text,
      date: new Date().toISOString().split('T')[0],
      status: 'queued',
      drawing: null,
    }

    store.unshift(entry)
    return entry
  }
})
