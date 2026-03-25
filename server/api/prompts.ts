import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const dataPath = join(process.cwd(), 'server/data/prompts.json')

function load() {
  return JSON.parse(readFileSync(dataPath, 'utf-8'))
}

function save(data: unknown[]) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

export default defineEventHandler(async (event) => {
  const method = event.method

  // GET — return all prompts
  if (method === 'GET') {
    return load()
  }

  // POST — add new prompt from visitor
  if (method === 'POST') {
    const body = await readBody(event)
    const text = (body?.text || '').trim()
    if (!text) throw createError({ statusCode: 400, message: 'text required' })

    const prompts = load()
    const newPrompt = {
      id: `p_${Date.now()}`,
      text,
      date: new Date().toISOString().split('T')[0],
      status: 'queued',
      drawing: null,
    }
    prompts.unshift(newPrompt)
    save(prompts)
    return newPrompt
  }
})
