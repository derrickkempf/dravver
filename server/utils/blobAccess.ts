// Vercel Blob stores are either PUBLIC or PRIVATE, chosen when the store is created
// (it can't be changed later). This app defaults to PRIVATE, so the files are only
// reachable through /api/drawings/<name>, which streams them from the store.
//
// If your store is public, set BLOB_ACCESS=public in the Vercel env vars and the raw
// blob URLs are used instead.

export const DRAWING_PREFIX = 'drawings/'
export const PROXY_BASE = '/api/drawings/'

export function blobAccess(): 'public' | 'private' {
  return (process.env.BLOB_ACCESS || '').toLowerCase() === 'public' ? 'public' : 'private'
}

/** What gets saved on the prompt and used as <img src>. */
export function drawingRef(blob: { url: string; pathname: string }): string {
  if (blobAccess() === 'public') return blob.url
  return PROXY_BASE + blob.pathname.slice(DRAWING_PREFIX.length)
}

/** What to pass to del() for a previously saved drawing ref. */
export function blobKeyFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null
  if (ref.startsWith(PROXY_BASE)) return DRAWING_PREFIX + ref.slice(PROXY_BASE.length)
  if (ref.includes('blob.vercel-storage.com')) return ref
  return null
}
