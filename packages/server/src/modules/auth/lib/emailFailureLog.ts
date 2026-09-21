// @investpro/server
// Log da falha de envio de e-mail (fire-and-forget: o cliente sempre recebe 200,
// então o log é a única pista pro operador). Traz o status HTTP e o código do
// erro do Resend, com o e-mail do destinatário mascarado e SEM o token/link.

import type { FastifyBaseLogger } from 'fastify'
import { EmailDeliveryError } from './emailDeliveryError.js'
import { maskEmail, maskEmailsIn } from './maskEmail.js'

export interface EmailFailureDetails {
  resendStatus?: number
  resendError?: string
  reason: string
}

export function describeEmailFailure(err: unknown): EmailFailureDetails {
  if (err instanceof EmailDeliveryError) {
    return { resendStatus: err.status, resendError: err.providerError, reason: maskEmailsIn(err.message) }
  }
  return { reason: maskEmailsIn(err instanceof Error ? err.message : String(err)) }
}

export function logEmailFailure(log: FastifyBaseLogger, message: string, to: string, err: unknown): void {
  log.error({ to: maskEmail(to), ...describeEmailFailure(err) }, message)
}
