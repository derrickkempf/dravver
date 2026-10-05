import { requireAdmin, startSession } from '../../utils/adminAuth'

// 200 if the cookie is valid (and renews it for another 30 days), otherwise 401.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  requireAdmin(event)
  startSession(event)
  return { ok: true }
})
