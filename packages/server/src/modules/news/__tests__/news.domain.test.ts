import { describe, expect, it } from 'vitest'
import {
  categorizeNews,
  dedupeNews,
  normalizeInput,
  sortNewsByDate,
  stripHtml,
  summarize,
  toNewsId,
} from '../news.domain.js'

describe('categorizeNews', () => {
  it('detecta cripto por palavra-chave', () => {
    expect(categorizeNews('bitcoin atinge novo recorde hoje', 'MARKET')).toBe('CRYPTO')
  })

  it('detecta macro por palavra-chave', () => {
    expect(categorizeNews('Copom mantém juros e cita inflação', 'MARKET')).toBe('MACRO')
  })

  it('detecta economia por palavra-chave', () => {
    expect(categorizeNews('ministério anuncia reforma tributária e orçamento', 'MARKET')).toBe('ECONOMY')
  })

  it('usa o fallback quando nenhuma palavra-chave bate', () => {
    expect(categorizeNews('texto totalmente neutro sem sinal', 'COMPANIES')).toBe('COMPANIES')
  })
})

describe('stripHtml / summarize', () => {
  it('remove tags e entidades HTML', () => {
    expect(stripHtml('<p>Olá &amp; <b>mundo</b></p>')).toBe('Olá & mundo')
  })

  it('trunca resumo longo no último espaço', () => {
    const long = 'a'.repeat(300)
    const result = summarize(long, 80)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(81)
  })
})

describe('dedupeNews', () => {
  it('remove duplicatas por url (case-insensitive)', () => {
    const items = [
      normalizeInput({ guid: '1', title: 'A', description: '', url: 'https://x.com/a', publishedAt: null }, 'Feed', 'MARKET'),
      normalizeInput({ guid: '2', title: 'A duplicada', description: '', url: 'https://x.com/A', publishedAt: null }, 'Feed', 'MARKET'),
    ]
    expect(dedupeNews(items)).toHaveLength(1)
  })
})

describe('sortNewsByDate', () => {
  it('ordena do mais recente para o mais antigo', () => {
    const older = normalizeInput(
      { guid: '1', title: 'velha', description: '', url: 'https://x.com/1', publishedAt: '2026-01-01T00:00:00.000Z' },
      'Feed',
      'MARKET',
    )
    const newer = normalizeInput(
      { guid: '2', title: 'nova', description: '', url: 'https://x.com/2', publishedAt: '2026-06-01T00:00:00.000Z' },
      'Feed',
      'MARKET',
    )
    expect(sortNewsByDate([older, newer]).map((i) => i.title)).toEqual(['nova', 'velha'])
  })
})

describe('toNewsId', () => {
  it('gera id estável a partir da url', () => {
    expect(toNewsId('guid', 'https://x.com/a')).toBe(toNewsId('guid', 'https://x.com/a'))
    expect(toNewsId('guid', 'https://x.com/a')).not.toBe(toNewsId('guid', 'https://x.com/b'))
  })
})