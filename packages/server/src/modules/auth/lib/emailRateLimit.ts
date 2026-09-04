// @investpro/server
// Rate limit em memória por email/conta para /auth/forgot-password (complementa
// o rate limit por IP do @fastify/rate-limit, que sozinho não impede alguém de
// martelar o mesmo email a partir de IPs diferentes).

const WINDOW_MS = 60_000

const lastRequestAt = new Map<string, number>()

export function isEmailRateLimited(email: string): boolean {
  const key = email.trim().toLowerCase()
  const now = Date.now()
  const last = lastRequestAt.get(key)

  if (last !== undefined && now - last < WINDOW_MS) {
    return true
  }

  lastRequestAt.set(key, now)
  return false
}
