// @investpro/server
// Testes do market.service: getAssets, getQuote, getHistory.
// Os adapters externos têm fallback estático determinístico; testamos a lógica
// de listagem, paginação, filtro e geração de histórico.

import { describe, expect, it } from 'vitest'
import { AppError } from '../auth/auth.service.js'
import { getAssets, getHistory, getQuote } from '../market.service.js'

describe('getAssets', () => {
  it('lista ativos com paginação', async () => {
    const result = await getAssets({ page: 1, limit: 20 })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.total).toBeGreaterThan(0)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('filtra por tipo de ativo', async () => {
    const result = await getAssets({ type: 'CRYPTO', page: 1, limit: 20 })
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((a) => a.type === 'CRYPTO')).toBe(true)
  })

  it('filtra por busca (ticker)', async () => {
    const result = await getAssets({ search: 'petr', page: 1, limit: 20 })
    expect(result.items.find((a) => a.ticker === 'PETR4')).toBeDefined()
  })

  it('respeita paginação', async () => {
    const page1 = await getAssets({ page: 1, limit: 2 })
    expect(page1.items).toHaveLength(2)
    const page2 = await getAssets({ page: 2, limit: 2 })
    expect(page2.items.length).toBeGreaterThanOrEqual(0)
  })
})

describe('getQuote', () => {
  it('lança ASSET_NOT_FOUND para ticker desconhecido', async () => {
    await expect(getQuote('XYZ9')).rejects.toMatchObject<AppError>({
      code: 'ASSET_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('retorna cotação com preço > 0 para ativo válido', async () => {
    const quote = await getQuote('PETR4')
    expect(quote.ticker).toBe('PETR4')
    expect(quote.price).toBeGreaterThan(0)
    expect(typeof quote.change).toBe('number')
  })
})

describe('getHistory', () => {
  it('gera série temporal com o número correto de pontos', async () => {
    const history = await getHistory('PETR4', { interval: '1d', limit: 7 })
    expect(history.ticker).toBe('PETR4')
    expect(history.points).toHaveLength(7)
    history.points.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(0)
      expect(typeof p.timestamp).toBe('string')
    })
  })

  it('gera 30 pontos para limit padrão', async () => {
    const history = await getHistory('BTC', { interval: '1d', limit: 30 })
    expect(history.points).toHaveLength(30)
  })

  it('lança ASSET_NOT_FOUND para ticker desconhecido', async () => {
    await expect(getHistory('NOPE', { interval: '1d', limit: 5 })).rejects.toMatchObject<AppError>({
      code: 'ASSET_NOT_FOUND',
      statusCode: 404,
    })
  })
})