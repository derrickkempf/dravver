// server/api/admin/upload.ts
// PATCH — update prompt status
// POST  — upload drawing image → Vercel Blob, URL saved in Upstash Redis
//
// Protected by x-admin-secret header.

import { put } from '@vercel/blob'
import { load, save } from '../prompts'
import type { Prompt } from '../prompts'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const secret = getHeader(event, 'x-admin-secret')
  if (!secret || secret !== config.adminSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const method = event.method

  // PATCH — update status
  if (method === 'PATCH') {
    const body = await readBody(event)
    const { id, status, drawing } = body

    // Allow test ping from admin auth check
    if (id === '__test__') return { ok: true }

    const prompts = await load()
    const idx = prompts.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    if (status)  prompts[idx].status  = status
    if (drawing) prompts[idx].drawing = drawing
    await save(prompts)
    return prompts[idx]
  }

  // POST — upload image to Vercel Blob, save URL to Redis
  if (method === 'POST') {
    const body = await readBody(event)
    const { id, imageBase64, mimeType } = body

    if (!id || !imageBase64) {
      throw createError({ statusCode: 400, message: 'id and imageBase64 required' })
    }

    const prompts = await load()
    const idx = prompts.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    const buffer = Buffer.from(imageBase64, 'base64')
    const ext = (mimeType || 'image/jpeg').split('/')[1] || 'jpg'
    const filename = `drawings/${id}.${ext}`

    const blob = await put(filename, buffer, {
      access: 'public',
      token: config.blobReadWriteToken,
      contentType: mimeType || 'image/jpeg',
    })

    prompts[idx].drawing = blob.url
    prompts[idx].status  = 'done'
    await save(prompts)

    return prompts[idx]
  }
})
