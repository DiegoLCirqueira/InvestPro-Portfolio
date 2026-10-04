// @investpro/server
// 400 VALIDATION_ERROR devolve só { error, message }, curta e em pt-BR: sem o
// detalhe interno do validador (keyword/schemaPath/instancePath, lista de valores).
// As mensagens escritas no shared (refines) chegam ao usuário como estão.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
  uniqueIp,
} from '../../test/integration.helpers.js'
import { validationMessage } from '../errors.js'

let app: FastifyInstance | undefined
let email = ''
let token = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('validation')
  token = (await registerTestUser(app, email)).body.accessToken as string
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

function createOrder(payload: Record<string, unknown>) {
  return app!.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    remoteAddress: uniqueIp(),
    payload,
  })
}

describe('400 VALIDATION_ERROR', () => {
  it('tipo errado: cita só o campo, sem detalhe do validador', async () => {
    const res = await createOrder({ ticker: ['VALE3'], side: 'BUY', quantity: 1 })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'VALIDATION_ERROR', message: 'Dados inválidos: ticker' })
  })

  it('valor fora do enum: não lista os valores aceitos', async () => {
    const res = await createOrder({ ticker: 'VALE3', side: 'HOLD', type: 'FOO', quantity: 1 })

    expect(res.json()).toEqual({ error: 'VALIDATION_ERROR', message: 'Dados inválidos: side, type' })
  })

  it('mensagem do refine do shared chega legível', async () => {
    const res = await createOrder({ ticker: 'VALE3', side: 'SELL', quantity: 1, useSavingsBox: true })

    expect(res.json()).toEqual({
      error: 'VALIDATION_ERROR',
      message: 'useSavingsBox só vale para compra (side=BUY)',
    })
  })

  it('querystring inválida também segue o formato curto', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/orders?limit=abc',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.json()).toEqual({ error: 'VALIDATION_ERROR', message: 'Dados inválidos: limit' })
  })
})

describe('validationMessage', () => {
  it('junta mensagens escritas e campos com erro genérico, sem repetir', () => {
    expect(
      validationMessage([
        { keyword: 'custom', instancePath: '/type', message: 'O DOC foi extinto em 2024. Use PIX ou TED.' },
        { keyword: 'invalid_type', instancePath: '/toAccount/account', message: 'Invalid input: expected string' },
        { keyword: 'too_small', instancePath: '/amount', message: 'Too small: expected number to be >0' },
        { keyword: 'too_small', instancePath: '/amount', message: 'Too small: expected number to be >0' },
      ])
    ).toBe('O DOC foi extinto em 2024. Use PIX ou TED.; Dados inválidos: toAccount.account, amount')
  })

  it('chave não reconhecida cita a chave; sem campo cai no genérico', () => {
    expect(
      validationMessage([{ keyword: 'unrecognized_keys', instancePath: '/', message: 'Unrecognized key: "extra"', params: { keys: ['extra'] } }])
    ).toBe('Dados inválidos: extra')
    expect(validationMessage([{ keyword: 'invalid_type', instancePath: '/', message: 'Invalid input' }])).toBe('Dados inválidos')
  })
})
