// @investpro/server
// Testes do adapter AwesomeAPI com fetch stubado (offline). A cotação alimenta
// câmbio executado com dinheiro real: bid inválido (NaN, zero, negativo,
// infinito) tem que ser descartado, nunca virar preço.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { awesomeapiSource } from '../adapters/awesomeapi.js'
import type { SourceAsset } from '../adapters/types.js'

const usdBrl: SourceAsset = {
  id: 'USD-BRL',
  ticker: 'USD-BRL',
  name: 'USD-BRL',
  type: 'FIXED_INCOME',
  remoteId: 'USD-BRL',
}

function stubAwesomeApiBid(bid: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ USDBRL: { bid, pctChange: '0.5' } })))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('awesomeapiSource.fetchQuotes', () => {
  it('converte bid válido em preço numérico', async () => {
    stubAwesomeApiBid('5.2345')
    const [quote] = await awesomeapiSource.fetchQuotes([usdBrl])
    expect(quote?.price).toBe(5.2345)
  })

  it.each(['NaN', 'abc', '0', '-1', 'Infinity', '-Infinity', ''])(
    'descarta bid inválido (%j) em vez de devolver como preço',
    async (bid) => {
      stubAwesomeApiBid(bid)
      await expect(awesomeapiSource.fetchQuotes([usdBrl])).rejects.toThrow(
        'AwesomeAPI: nenhuma cotação retornada'
      )
    }
  )
})
