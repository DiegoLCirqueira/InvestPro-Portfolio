// @investpro/server
// Testes de INTEGRAÇÃO das rotas autenticadas da caixinha contra o PostgreSQL real.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import {
  deleteUser,
  fundPortfolio,
  registerTestUser,
  startApp,
  stopApp,
  uniqueEmail,
} from '../../../test/integration.helpers.js'

let app: FastifyInstance | undefined
let email = ''
let token = ''
let userId = ''

beforeAll(async () => {
  app = await startApp()
  email = uniqueEmail('savings')
  const reg = await registerTestUser(app, email)
  token = reg.body.accessToken as string
  userId = reg.body.user.id as string
  await fundPortfolio(userId, 1000)
})

afterAll(async () => {
  await stopApp(app)
  await deleteUser(email)
})

describe('GET /api/v1/savings-box', () => {
  it('sem depósito ainda: balance 0, rate informativa, sem 404', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/api/v1/savings-box',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.balance).toBe(0)
    expect(body.rate).toBe(0.06)
    expect(body.estimatedYield).toBe(0)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({ method: 'GET', url: '/api/v1/savings-box' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/savings-box/deposit', () => {
  it('move valor do portfolio pra caixinha', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/deposit',
      headers: { authorization: `Bearer ${token}` },
      payload: { amount: 300 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().balance).toBe(300)

    const portfolio = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(portfolio.json().balance).toBe(700)
  })

  it('retorna 400 PORTFOLIO_INSUFFICIENT_BALANCE se exceder o saldo do portfólio, sem alterar nada', async () => {
    const before = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    const beforeBox = await app!.inject({
      method: 'GET',
      url: '/api/v1/savings-box',
      headers: { authorization: `Bearer ${token}` },
    })

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/deposit',
      headers: { authorization: `Bearer ${token}` },
      payload: { amount: 999999 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('PORTFOLIO_INSUFFICIENT_BALANCE')

    const after = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    const afterBox = await app!.inject({
      method: 'GET',
      url: '/api/v1/savings-box',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(after.json().balance).toBe(before.json().balance)
    expect(afterBox.json().balance).toBe(beforeBox.json().balance)
  })

  it('retorna 400 para amount não positivo', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/deposit',
      headers: { authorization: `Bearer ${token}` },
      payload: { amount: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/deposit',
      payload: { amount: 10 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/savings-box/withdraw', () => {
  it('move valor da caixinha de volta pro portfolio', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/withdraw',
      headers: { authorization: `Bearer ${token}` },
      payload: { amount: 100 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().balance).toBe(200) // 300 depositado - 100 resgatado

    const portfolio = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(portfolio.json().balance).toBe(800) // 700 + 100 resgatado
  })

  it('retorna 400 SAVINGS_BOX_INSUFFICIENT_BALANCE se exceder o saldo da caixinha, sem alterar nada', async () => {
    const before = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    const beforeBox = await app!.inject({
      method: 'GET',
      url: '/api/v1/savings-box',
      headers: { authorization: `Bearer ${token}` },
    })

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/withdraw',
      headers: { authorization: `Bearer ${token}` },
      payload: { amount: 999999 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('SAVINGS_BOX_INSUFFICIENT_BALANCE')

    const after = await app!.inject({
      method: 'GET',
      url: '/api/v1/portfolio',
      headers: { authorization: `Bearer ${token}` },
    })
    const afterBox = await app!.inject({
      method: 'GET',
      url: '/api/v1/savings-box',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(after.json().balance).toBe(before.json().balance)
    expect(afterBox.json().balance).toBe(beforeBox.json().balance)
  })

  it('resgate de quem nunca depositou (sem SavingsBox ainda) retorna 400, não 500', async () => {
    const freshEmail = uniqueEmail('savings-nobox')
    const reg = await registerTestUser(app!, freshEmail)

    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/withdraw',
      headers: { authorization: `Bearer ${reg.body.accessToken}` },
      payload: { amount: 10 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('SAVINGS_BOX_INSUFFICIENT_BALANCE')

    await deleteUser(freshEmail)
  }, 15000)

  it('retorna 401 sem token', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/api/v1/savings-box/withdraw',
      payload: { amount: 10 },
    })
    expect(res.statusCode).toBe(401)
  })
})
