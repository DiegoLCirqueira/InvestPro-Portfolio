// @investpro/server
// Falha de envio de e-mail (Resend): o erro carrega o status HTTP e o código do
// provedor, o e-mail do destinatário é mascarado em erro e log, e o log nunca traz
// token/link. O envio é fire-and-forget (o cliente sempre recebe 200), então esse
// log é a única pista pro operador entender por que o e-mail não chegou.

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'

vi.mock('../../../config/env.js', () => ({
  env: {
    RESEND_API_KEY: 'chave-de-teste',
    RESEND_FROM_EMAIL: 'InvestPro <onboarding@resend.dev>',
  },
}))

import { EmailDeliveryError } from '../lib/emailDeliveryError.js'
import { describeEmailFailure, logEmailFailure } from '../lib/emailFailureLog.js'
import { sendPasswordResetEmail } from '../lib/email.js'
import { maskEmail, maskEmailsIn } from '../lib/maskEmail.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('maskEmail / maskEmailsIn', () => {
  it('mostra só a inicial do usuário e do domínio', () => {
    expect(maskEmail('diego@gmail.com')).toBe('d***@g***.com')
    expect(maskEmail('a@b.co.uk')).toBe('a***@b***.co.uk')
  })

  it('mascara e-mails soltos dentro de um texto', () => {
    const text = 'You can only send testing emails to your own email address (dono@exemplo.com.br).'

    const masked = maskEmailsIn(text)

    expect(masked).not.toContain('dono@exemplo.com.br')
    expect(masked).toContain('d***@e***.com.br')
  })
})

const RESEND_TEST_ADDRESS_ERROR = {
  statusCode: 403,
  name: 'validation_error',
  message:
    'You can only send testing emails to your own email address (dono@exemplo.com). ' +
    'To send emails to other recipients, please verify a domain at resend.com/domains.',
}

function stubResendResponse(status: number, body: unknown): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

describe('sendPasswordResetEmail — falha do Resend', () => {
  it('HTTP 403 vira EmailDeliveryError com status e código do provedor, e a mensagem sem o e-mail do dono', async () => {
    stubResendResponse(403, RESEND_TEST_ADDRESS_ERROR)

    const error = await sendPasswordResetEmail('destino@outra.com', 'http://x/reset?token=t').catch((err) => err)

    expect(error).toBeInstanceOf(EmailDeliveryError)
    expect(error.status).toBe(403)
    expect(error.providerError).toBe('validation_error')
    expect(error.message).toContain('403')
    expect(error.message).toContain('validation_error')
    expect(error.message).not.toContain('dono@exemplo.com')
  })

  it('corpo de erro que não é JSON: guarda o status e um trecho do texto', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Bad Gateway', { status: 502 })))

    const error = await sendPasswordResetEmail('destino@outra.com', 'http://x').catch((err) => err)

    expect(error).toMatchObject({ status: 502, providerError: undefined })
    expect(error.message).toContain('Bad Gateway')
  })

  it('falha de rede vira EmailDeliveryError sem status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNRESET'))))

    const error = await sendPasswordResetEmail('destino@outra.com', 'http://x').catch((err) => err)

    expect(error).toBeInstanceOf(EmailDeliveryError)
    expect(error.status).toBeUndefined()
    expect(error.message).toContain('ECONNRESET')
  })
})

describe('logEmailFailure', () => {
  const fakeLog = () => ({ error: vi.fn() })

  it('registra o status e o código do Resend com o destinatário mascarado, sem token/link/e-mail completo', async () => {
    stubResendResponse(403, RESEND_TEST_ADDRESS_ERROR)
    const link = 'http://localhost:5173/reset-password?token=TOKEN-SECRETO-DO-RESET'
    const error = await sendPasswordResetEmail('destino@outra.com', link).catch((err) => err)
    const log = fakeLog()

    logEmailFailure(log as unknown as FastifyBaseLogger, 'Erro ao enviar email', 'destino@outra.com', error)

    expect(log.error).toHaveBeenCalledTimes(1)
    const [fields, message] = log.error.mock.calls[0]
    expect(message).toBe('Erro ao enviar email')
    expect(fields).toMatchObject({ to: 'd***@o***.com', resendStatus: 403, resendError: 'validation_error' })
    const logged = JSON.stringify(log.error.mock.calls)
    expect(logged).not.toContain('destino@outra.com')
    expect(logged).not.toContain('dono@exemplo.com')
    expect(logged).not.toContain('TOKEN-SECRETO-DO-RESET')
  })

  it('erro que não é do provedor (ex.: chave ausente): registra só o motivo', () => {
    expect(describeEmailFailure(new Error('RESEND_API_KEY não configurada'))).toEqual({
      reason: 'RESEND_API_KEY não configurada',
    })
  })
})
