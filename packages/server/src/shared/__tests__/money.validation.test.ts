// @investpro/server
// Regressão: valor monetário de entrada com mais de 2 casas decimais ou acima do
// teto é barrado na borda (400 VALIDATION_ERROR), em todas as rotas que recebem
// dinheiro. As colunas de saldo são Decimal(15,2) — um valor fracionado seria
// arredondado pelo banco (cria/destrói centavos) e um valor acima do teto
// estouraria a coluna (500). Validação roda antes do
// handler, então estes testes não escrevem nada no banco.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { hasAtMostDecimalPlaces, moneyAmountSchema } from '@investpro/shared'
import {
  signAccessTokenFor,
  startApp,
  stopApp,
  uniqueIp,
} from '../../test/integration.helpers.js'

describe('moneyAmountSchema (helper único do shared)', () => {
  // Valores que uma checagem ingênua (`% 0.01`) rejeitaria por ruído de float.
  it.each([0.01, 0.07, 0.1 + 0.2, 1.15, 19.99, 100, 1234567.89, 9_999_999_999_999.99])('aceita %s', (value) => {
    expect(moneyAmountSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    0.004, 0.005, 0.001, 1.005, 10.123, 0, -1, Number.NaN, Number.POSITIVE_INFINITY,
    10_000_000_000_000, 1e21, // acima do teto do Decimal(15,2) (1e21 nem é impresso com casas por toFixed)
  ])(
    'rejeita %s',
    (value) => {
      expect(moneyAmountSchema.safeParse(value).success).toBe(false)
    }
  )
})

describe('hasAtMostDecimalPlaces (quantidade de ordem: 8 casas)', () => {
  it.each([1, 0.5, 0.12345678, 1234567.12345678])('aceita %s', (value) => {
    expect(hasAtMostDecimalPlaces(value, 8)).toBe(true)
  })

  it.each([0.123456789, 0.000000001, 0.123456789012])('rejeita %s', (value) => {
    expect(hasAtMostDecimalPlaces(value, 8)).toBe(false)
  })
})

interface MoneyEndpoint {
  name: string
  url: string
  bodyWith: (amount: number) => Record<string, unknown>
}

const MONEY_ENDPOINTS: MoneyEndpoint[] = [
  {
    name: 'exchange/convert',
    url: '/api/v1/exchange/convert',
    bodyWith: (amount) => ({ from: 'USD', to: 'BRL', amount }),
  },
  {
    name: 'exchange/execute',
    url: '/api/v1/exchange/execute',
    bodyWith: (amount) => ({ from: 'BRL', to: 'USD', amount }),
  },
  {
    name: 'savings-box/deposit',
    url: '/api/v1/savings-box/deposit',
    bodyWith: (amount) => ({ amount }),
  },
  {
    name: 'savings-box/withdraw',
    url: '/api/v1/savings-box/withdraw',
    bodyWith: (amount) => ({ amount }),
  },
  {
    name: 'portfolio/topup',
    url: '/api/v1/portfolio/topup',
    bodyWith: (amount) => ({ amount }),
  },
  {
    name: 'transfers',
    url: '/api/v1/transfers',
    bodyWith: (amount) => ({ type: 'PIX', amount, pixKey: 'qa-pix@investpro.com' }),
  },
  {
    name: 'orders (price)',
    url: '/api/v1/orders',
    bodyWith: (price) => ({ ticker: 'VALE3', side: 'BUY', quantity: 1, type: 'LIMIT', price }),
  },
]

const FRACTIONAL_AMOUNTS = [0.004, 0.005, 10.123]
// 1e21: sem teto, toFixed devolve notação exponencial, passava na precisão e estourava o Decimal(15,2) (500).
const ABOVE_CEILING_AMOUNTS = [10_000_000_000_000, 1e21]

let app: FastifyInstance | undefined
let token = ''

beforeAll(async () => {
  app = await startApp()
  token = signAccessTokenFor('00000000-0000-0000-0000-000000000000')
})

afterAll(async () => {
  await stopApp(app)
})

function postAmount(endpoint: MoneyEndpoint, amount: number) {
  return app!.inject({
    method: 'POST',
    url: endpoint.url,
    headers: { authorization: `Bearer ${token}` },
    remoteAddress: uniqueIp(),
    payload: endpoint.bodyWith(amount),
  })
}

function endpointsWith(amounts: number[]) {
  return MONEY_ENDPOINTS.flatMap((endpoint) =>
    amounts.map((amount) => [endpoint.name, amount, endpoint] as const)
  )
}

describe.each([
  ['com mais de 2 casas decimais', FRACTIONAL_AMOUNTS, 'casas decimais'],
  ['acima do teto monetário', ABOVE_CEILING_AMOUNTS, 'acima do máximo'],
])('POST com valor %s', (_case, amounts, expectedMessage) => {
  it.each(endpointsWith(amounts))(
    '%s com %s retorna 400 VALIDATION_ERROR (não 500)',
    async (_name, amount, endpoint) => {
      const res = await postAmount(endpoint, amount)

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')
      expect(res.json().message).toContain(expectedMessage)
    }
  )
})
