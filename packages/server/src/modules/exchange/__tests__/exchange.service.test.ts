// @investpro/server
// Testes do exchange.service: getRate, convert, listCurrencies.
// Os adapters externos têm fallback estático; testamos com a real behavior
// (quando a API responde, usa taxa ao vivo; quando falha, usa fallback).
// Sem mock: valida a lógica de conversão e fallback.

import { describe, expect, it } from 'vitest'

import { convert, getRate, listCurrencies } from '../exchange.service.js'

describe('getRate', () => {
  it('retorna taxa 1 quando from === to', async () => {
    const result = await getRate('BRL', 'BRL')
    expect(result.rate).toBe(1)
    expect(result.from).toBe('BRL')
    expect(result.to).toBe('BRL')
    expect(typeof result.timestamp).toBe('string')
  })

  it('retorna taxa positiva para par válido (USD→BRL)', async () => {
    const result = await getRate('USD', 'BRL')
    expect(result.rate).toBeGreaterThan(0)
    expect(result.from).toBe('USD')
    expect(result.to).toBe('BRL')
  })

  it('retorna taxa positiva para par reverso (BRL→USD)', async () => {
    const result = await getRate('BRL', 'USD')
    expect(result.rate).toBeGreaterThan(0)
  })
})

describe('convert', () => {
  it('calcula valor convertido para par válido', async () => {
    const result = await convert('USD', 'BRL', 100)
    expect(result.rate).toBeGreaterThan(0)
    expect(result.convertedAmount).toBeGreaterThanOrEqual(0)
    expect(result.amount).toBe(100)
    expect(result.fee).toBeGreaterThanOrEqual(0)
    expect(result).toHaveProperty('timestamp')
  })

  it('mantém convertedAmount positivo para EUR→BRL', async () => {
    const result = await convert('EUR', 'BRL', 50)
    expect(result.convertedAmount).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeGreaterThan(0)
  })
})

describe('listCurrencies', () => {
  it('retorna base BRL e moedas suportadas', () => {
    const result = listCurrencies('BRL')
    expect(result.base).toBe('BRL')
    expect(result.items).toContain('USD')
    expect(result.items).toContain('JPY')
    expect(result.items).toContain('EUR')
  })

  it('inclui todas as 9 moedas suportadas', () => {
    const result = listCurrencies('BRL')
    expect(result.items).toHaveLength(9)
  })
})