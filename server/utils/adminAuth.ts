// Admin auth: a signed, httpOnly cookie that lasts 30 days (and rolls forward each visit).
// The cookie is signed with ADMIN_SECRET, so changing that env var logs everyone out.
// The old x-admin-secret header still works for scripts.

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE = 'dravver_admin'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secretValue(): string {
  return (useRuntimeConfig().adminSecret as string) || ''
}

function sign(exp: string, secret: string): string {
  return createHmac('sha256', secret).update(`dravver-admin:${exp}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function checkSecret(input: unknown): boolean {
  const secret = secretValue()
  return !!secret && typeof input === 'string' && input.length > 0 && safeEqual(input, secret)
}

export function startSession(event: H3Event) {
  const secret = secretValue()
  const exp = String(Date.now() + MAX_AGE * 1000)
  setCookie(event, COOKIE, `${exp}.${sign(exp, secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function endSession(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

export function isAdmin(event: H3Event): boolean {
  const secret = secretValue()
  if (!secret) return false

  const header = getHeader(event, 'x-admin-secret')
  if (header && safeEqual(header, secret)) return true

  const cookie = getCookie(event, COOKIE)
  if (!cookie) return false
  const [exp, sig] = cookie.split('.')
  if (!exp || !sig || !(Number(exp) > Date.now())) return false
  return safeEqual(sig, sign(exp, secret))
}

export function requireAdmin(event: H3Event) {
  if (!isAdmin(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Unauthorized' })
  }
}
