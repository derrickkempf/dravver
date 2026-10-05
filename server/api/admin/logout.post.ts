import { endSession } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  endSession(event)
  return { ok: true }
})
