// @investpro/server
// Rate limit em memória por conta para /auth/login (AppSec, checkup de
// 2026-09-16): complementa o limite por IP do @fastify/rate-limit (5/min),
// que sozinho não impede um ataque de credential stuffing distribuído entre
// vários IPs contra a MESMA conta. A chave é livre (e-mail no login; outra chave
// por fluxo que confere senha, ex. definir o CPF), cada uma com o seu contador.

const WINDOW_MS = 15 * 60_000
const MAX_FAILED_ATTEMPTS = 10

interface AttemptRecord {
  count: number
  windowStart: number
}

const attempts = new Map<string, AttemptRecord>()

function normalize(accountKey: string): string {
  return accountKey.trim().toLowerCase()
}

export function isAccountRateLimited(accountKey: string): boolean {
  const key = normalize(accountKey)
  const record = attempts.get(key)
  if (!record) return false

  if (Date.now() - record.windowStart >= WINDOW_MS) {
    attempts.delete(key)
    return false
  }

  return record.count >= MAX_FAILED_ATTEMPTS
}

export function registerLoginFailure(accountKey: string): void {
  const key = normalize(accountKey)
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.windowStart >= WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now })
    return
  }

  record.count += 1
}

export function clearLoginAttempts(accountKey: string): void {
  attempts.delete(normalize(accountKey))
}
