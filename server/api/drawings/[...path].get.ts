// Streams a drawing out of a PRIVATE Vercel Blob store so <img src="/api/drawings/..."> works.
// Drawings are meant to be public on the site; only the store itself is private.

import { get } from '@vercel/blob'
import { DRAWING_PREFIX } from '../../utils/blobAccess'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const rel = getRouterParam(event, 'path') || ''

  // Only plain file names inside drawings/ — no folders, no "..", nothing else in the store
  if (!/^[A-Za-z0-9_.+-]+$/.test(rel) || rel.includes('..')) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  let result
  try {
    result = await get(DRAWING_PREFIX + rel, {
      access: 'private',
      token: config.blobReadWriteToken,
      ifNoneMatch: getHeader(event, 'if-none-match') || undefined,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[dravver] drawing fetch failed:', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not load drawing' })
  }

  if (!result) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // File names include a random suffix, so a given URL never changes: cache it hard.
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
  setHeader(event, 'ETag', result.blob.etag)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  if (result.statusCode === 304) {
    setResponseStatus(event, 304)
    return null
  }

  setHeader(event, 'Content-Type', result.blob.contentType)
  // SVGs can carry scripts; sandbox them if someone opens the URL directly
  setHeader(event, 'Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
  return sendStream(event, result.stream)
})
