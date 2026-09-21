// @investpro/server
// Envio de email transacional via Resend (API HTTP direta, sem SDK).

import { env } from '../../../config/env.js'
import { RESET_TOKEN_EXPIRY_MINUTES } from './resetToken.js'
import { EmailDeliveryError } from './emailDeliveryError.js'
import { maskEmailsIn } from './maskEmail.js'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FETCH_TIMEOUT_MS = 10_000

interface ResendErrorBody {
  name?: string
  message?: string
}

async function readResendError(response: Response): Promise<ResendErrorBody> {
  const text = await response.text().catch(() => '')
  try {
    return JSON.parse(text) as ResendErrorBody
  } catch {
    return { message: text.slice(0, 200) }
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada')
  }

  let response: Response
  try {
    response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to, subject, html }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch (err) {
    throw new EmailDeliveryError(
      `Resend: falha de rede ao enviar email: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (!response.ok) {
    const { name, message } = await readResendError(response)
    throw new EmailDeliveryError(
      `Resend: HTTP ${response.status} (${name ?? 'sem código'}) ao enviar email: ${maskEmailsIn(message ?? '')}`,
      response.status,
      name
    )
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendEmail(
    to,
    'Redefinição de senha — InvestPro',
    `<p>Recebemos uma solicitação para redefinir a senha da sua conta InvestPro.</p>
     <p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>
     <p>Este link expira em ${RESET_TOKEN_EXPIRY_MINUTES} minutos. Se você não solicitou essa alteração, ignore este email.</p>`
  )
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  await sendEmail(
    to,
    'Sua senha foi alterada — InvestPro',
    `<p>A senha da sua conta InvestPro foi alterada com sucesso.</p>
     <p>Se você não fez essa alteração, entre em contato com o suporte imediatamente.</p>`
  )
}
