import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const dataPath = join(process.cwd(), 'server/data/prompts.json')
const drawingsDir = join(process.cwd(), 'public/drawings')

function load() {
  return JSON.parse(readFileSync(dataPath, 'utf-8')) as Prompt[]
}

function save(data: Prompt[]) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check admin secret header
  const secret = getHeader(event, 'x-admin-secret')
  if (secret !== config.adminSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const method = event.method

  // PATCH — update status of a prompt
  if (method === 'PATCH') {
    const body = await readBody(event)
    const { id, status, drawing } = body

    const prompts = load()
    const idx = prompts.findIndex(p => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    if (status) prompts[idx].status = status
    if (drawing) prompts[idx].drawing = drawing
    save(prompts)
    return prompts[idx]
  }

  // POST — upload a drawing image (base64) for a prompt
  if (method === 'POST') {
    const body = await readBody(event)
    const { id, imageBase64, mimeType } = body

    if (!id || !imageBase64) {
      throw createError({ statusCode: 400, message: 'id and imageBase64 required' })
    }

    const prompts = load()
    const idx = prompts.findIndex(p => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    // Save image to public/drawings/
    mkdirSync(drawingsDir, { recursive: true })
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg'
    const filename = `${id}.${ext}`
    const buffer = Buffer.from(imageBase64, 'base64')
    writeFileSync(join(drawingsDir, filename), buffer)

    prompts[idx].drawing = `/drawings/${filename}`
    prompts[idx].status = 'done'
    save(prompts)

    return prompts[idx]
  }
})
