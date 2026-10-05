// server/api/admin/upload.ts
// PATCH — update prompt status
// DELETE — remove a prompt (and its drawing file)
// POST  — upload drawing image → Vercel Blob (private by default; see utils/blobAccess.ts),
//         reference saved with the prompt, status set to "done"
//
// Protected by the admin session cookie (or the x-admin-secret header).

import { put, del } from '@vercel/blob'
import { loadPrompts, savePrompts } from '../../utils/promptStore'
import type { Prompt } from '../../utils/promptStore'
import { requireAdmin } from '../../utils/adminAuth'
import { blobAccess, blobKeyFromRef, drawingRef, DRAWING_PREFIX } from '../../utils/blobAccess'

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')

  const method = event.method

  // PATCH — update status
  if (method === 'PATCH') {
    const body = await readBody(event)
    const { id, status, drawing } = body

    const prompts = await loadPrompts()
    const idx = prompts.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    if (status)  prompts[idx].status  = status
    if (drawing) prompts[idx].drawing = drawing
    await savePrompts(prompts)
    return prompts[idx]
  }

  // POST — upload image to Vercel Blob, save URL
  if (method === 'POST') {
    const body = await readBody(event)
    const { id, imageBase64, mimeType } = body

    if (!id || !imageBase64) {
      throw createError({ statusCode: 400, message: 'id and imageBase64 required' })
    }
    const type = (mimeType || 'image/jpeg').toString()
    if (!type.startsWith('image/')) {
      throw createError({ statusCode: 400, message: 'only images can be uploaded' })
    }
    if (!config.blobReadWriteToken) {
      throw createError({ statusCode: 500, statusMessage: 'Blob not configured', message: 'BLOB_READ_WRITE_TOKEN is not set on the server' })
    }

    const prompts = await loadPrompts()
    const idx = prompts.findIndex((p: Prompt) => p.id === id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    const buffer = Buffer.from(imageBase64, 'base64')
    const filename = `${DRAWING_PREFIX}${id}.${EXT[type] || 'jpg'}`
    const previous = prompts[idx].drawing

    let url: string
    try {
      const blob = await put(filename, buffer, {
        access: blobAccess(),
        token: config.blobReadWriteToken,
        contentType: type,
        addRandomSuffix: true,
      })
      url = drawingRef(blob)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[dravver] blob upload failed:', err)
      throw createError({
        statusCode: 502,
        statusMessage: 'Blob upload failed',
        message: `Blob upload failed: ${(err as Error).message ?? err}`,
      })
    }

    prompts[idx].drawing = url
    prompts[idx].status  = 'done'
    await savePrompts(prompts)

    // Tidy up the replaced file (best effort)
    const oldKey = previous !== url ? blobKeyFromRef(previous) : null
    if (oldKey) del(oldKey, { token: config.blobReadWriteToken }).catch(() => {})

    return prompts[idx]
  }

  // DELETE — remove a prompt and its stored drawing
  if (method === 'DELETE') {
    const body = await readBody(event)
    const prompts = await loadPrompts()
    const idx = prompts.findIndex((p: Prompt) => p.id === body?.id)
    if (idx === -1) throw createError({ statusCode: 404, message: 'Prompt not found' })

    const [removed] = prompts.splice(idx, 1)
    await savePrompts(prompts)

    const key = blobKeyFromRef(removed.drawing)
    if (key) del(key, { token: config.blobReadWriteToken }).catch(() => {})
    return { ok: true }
  }

  throw createError({ statusCode: 405, message: 'method not allowed' })
})
