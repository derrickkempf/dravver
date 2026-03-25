// server/api/admin/upload.ts
// PATCH — update prompt status
// POST  — upload a drawing image → stores in Vercel Blob

import { put } from '@vercel/blob'
import { getStore, setStore } from '../prompts'

interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Auth check
  const secret = getHeader(event, 'x-admin-secret')
  if (!secret || secret !== config.adminSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const method = event.method

  // PATCH — update status (and optionally drawing URL) for a prompt
  if (method === 'PATCH') {
    const body = await readBody(event)
    const { id, status, drawing } = body

    const store = getStore()
    const idx = store.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    if (status) store[idx].status = status
    if (drawing) store[idx].drawing = drawing
    setStore(store)
    return store[idx]
  }

  // POST — receive a base64 image, upload to Vercel Blob, save URL on prompt
  if (method === 'POST') {
    const body = await readBody(event)
    const { id, imageBase64, mimeType } = body

    if (!id || !imageBase64) {
      throw createError({ statusCode: 400, message: 'id and imageBase64 required' })
    }

    const store = getStore()
    const idx = store.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    // Convert base64 → Buffer → Blob upload
    const buffer = Buffer.from(imageBase64, 'base64')
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg'
    const filename = `drawings/${id}.${ext}`

    const blob = await put(filename, buffer, {
      access: 'public',
      token: config.blobReadWriteToken,
      contentType: mimeType || 'image/jpeg',
    })

    store[idx].drawing = blob.url
    store[idx].status = 'done'
    setStore(store)

    return store[idx]
  }
})
