import { checkSecret, startSession } from '../../utils/adminAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!checkSecret(body?.secret)) {
    await new Promise((r) => setTimeout(r, 500)) // slow down guessing
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Wrong secret' })
  }
  startSession(event)
  return { ok: true }
})
