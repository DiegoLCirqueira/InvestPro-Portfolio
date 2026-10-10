import { describe, expect, it } from 'vitest'
import {
  applySourcePolicy,
  categorizeNews,
  dedupeHeadlines,
  dedupeNews,
  normalizeHeadline,
  normalizeInput,
  sortNewsByDate,
  stripHtml,
  summarize,
  toNewsId,
  type NormalizedNews,
} from '../news.domain.js'

describe('categorizeNews', () => {
  it('detecta cripto por palavra-chave', () => {
    expect(categorizeNews('bitcoin atinge novo recorde hoje')).toBe('CRYPTO')
  })

  it('detecta macro por palavra-chave', () => {
    expect(categorizeNews('Copom mantém juros e cita inflação')).toBe('MACRO')
  })

  it('detecta economia por palavra-chave', () => {
    expect(categorizeNews('ministério anuncia reforma tributária e orçamento')).toBe('ECONOMY')
  })

  it('retorna null quando nenhuma palavra-chave bate (WI-29: sem fallback, item é descartado depois)', () => {
    expect(categorizeNews('texto totalmente neutro sem sinal')).toBeNull()
  })
})

describe('applySourcePolicy (WI-29: filtro de relevância/idioma)', () => {
  function item(overrides: Partial<NormalizedNews> = {}): NormalizedNews {
    return {
      guid: 'g',
      title: 't',
      summary: 's',
      source: 'Feed',
      category: null,
      url: 'https://x.com/a',
      publishedAt: null,
      ...overrides,
    }
  }

  it('descarta item sem nenhuma keyword numa fonte comum (ex: InfoMoney)', () => {
    expect(applySourcePolicy(item({ category: null }), { category: 'MARKET' })).toBeNull()
  })

  it('descarta item do MarketWatch com categoria WORLD genérica (fora de MARKET/MACRO)', () => {
    const result = applySourcePolicy(
      item({ category: 'WORLD' }),
      { category: 'WORLD', requiredCategories: ['MARKET', 'MACRO'] },
    )
    expect(result).toBeNull()
  })

  it('aceita item do MarketWatch quando a categoria é MARKET ou MACRO', () => {
    const market = applySourcePolicy(
      item({ category: 'MARKET' }),
      { category: 'WORLD', requiredCategories: ['MARKET', 'MACRO'] },
    )
    const macro = applySourcePolicy(
      item({ category: 'MACRO' }),
      { category: 'WORLD', requiredCategories: ['MARKET', 'MACRO'] },
    )
    expect(market?.category).toBe('MARKET')
    expect(macro?.category).toBe('MACRO')
  })

  it('CoinDesk sempre passa (alwaysInclude), mesmo sem nenhuma keyword batendo', () => {
    const result = applySourcePolicy(
      item({ category: null }),
      { category: 'CRYPTO', alwaysInclude: true },
    )
    expect(result?.category).toBe('CRYPTO')
  })

  it('CoinDesk mantém a categoria detectada quando uma keyword bate', () => {
    const result = applySourcePolicy(
      item({ category: 'CRYPTO' }),
      { category: 'CRYPTO', alwaysInclude: true },
    )
    expect(result?.category).toBe('CRYPTO')
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

  it.each([
    ['<p>Ibovespa sobe 1%.</p><p>The post <a href="https://x">Ibovespa sobe</a> appeared first on InfoMoney.</p>', 'Ibovespa sobe 1%.'],
    ['Dólar cai. O post Dólar cai apareceu primeiro em Money Times.', 'Dólar cai.'],
  ])('remove o rodapé do RSS do WordPress: %s', (html, expected) => {
    expect(summarize(html)).toBe(expected)
  })

  it('mantém texto que só cita "the post" no meio da notícia', () => {
    expect(summarize('Analysts read the post-earnings call as positive.')).toBe(
      'Analysts read the post-earnings call as positive.'
    )
  })
})

describe('dedupeNews', () => {
  it('remove duplicatas por url (case-insensitive)', () => {
    const items = [
      normalizeInput({ guid: '1', title: 'A', description: '', url: 'https://x.com/a', publishedAt: null }, 'Feed'),
      normalizeInput({ guid: '2', title: 'A duplicada', description: '', url: 'https://x.com/A', publishedAt: null }, 'Feed'),
    ]
    expect(dedupeNews(items)).toHaveLength(1)
  })
})

describe('sortNewsByDate', () => {
  it('ordena do mais recente para o mais antigo', () => {
    const older = normalizeInput(
      { guid: '1', title: 'velha', description: '', url: 'https://x.com/1', publishedAt: '2026-01-01T00:00:00.000Z' },
      'Feed',
    )
    const newer = normalizeInput(
      { guid: '2', title: 'nova', description: '', url: 'https://x.com/2', publishedAt: '2026-06-01T00:00:00.000Z' },
      'Feed',
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
describe('normalizeHeadline', () => {
  it('ignora caixa, acentos e pontuação', () => {
    expect(normalizeHeadline('Furacão Isaías deixa 2 mortos — e milhares sem energia!')).toBe(
      normalizeHeadline('furacao isaias deixa 2 mortos e milhares sem energia')
    )
  })
})

describe('normalizeInput: resumo igual ao título', () => {
  const raw = { guid: 'g', url: 'https://x/1', publishedAt: null }

  it('vira resumo vazio', () => {
    const item = normalizeInput(
      { ...raw, title: 'Furacão Isaias deixa 2 mortos nos EUA', description: '<p>Furacão Isaias deixa 2 mortos nos EUA.</p>' },
      'InfoMoney'
    )
    expect(item.summary).toBe('')
  })

  it('resumo diferente do título continua', () => {
    const item = normalizeInput(
      { ...raw, title: 'Furacão Isaias deixa 2 mortos', description: 'Tempestade atinge a costa leste.' },
      'InfoMoney'
    )
    expect(item.summary).toBe('Tempestade atinge a costa leste.')
  })
})

describe('dedupeHeadlines', () => {
  const news = (source: string, title: string, publishedAt: string, summary = 'Resumo.'): NormalizedNews => ({
    guid: `${source}-${publishedAt}`,
    title,
    summary,
    source,
    category: 'WORLD',
    url: `https://${source}.example/${publishedAt}`,
    publishedAt,
  })

  it('mesma manchete de fontes diferentes vira uma só: a mais recente', () => {
    const result = dedupeHeadlines(
      sortNewsByDate([
        news('investing', 'Furacão Isaias deixa 2 mortos nos EUA', '2026-10-05T12:49:00Z'),
        news('infomoney', 'Furacão Isaías deixa 2 mortos nos EUA!', '2026-10-05T13:40:00Z'),
      ])
    )
    expect(result.map((n) => n.source)).toEqual(['infomoney'])
  })

  it('prefere a que tem resumo, mesmo sendo a mais antiga', () => {
    const result = dedupeHeadlines(
      sortNewsByDate([
        news('investing', 'Furacão Isaias deixa 2 mortos', '2026-10-05T12:49:00Z', 'Tempestade atinge a costa.'),
        news('infomoney', 'Furacão Isaias deixa 2 mortos', '2026-10-05T13:40:00Z', ''),
      ])
    )
    expect(result.map((n) => n.source)).toEqual(['investing'])
  })

  it('a mesma manchete fora da janela de 24 h são notícias diferentes', () => {
    const result = dedupeHeadlines(
      sortNewsByDate([
        news('infomoney', 'Ibovespa fecha em alta', '2026-10-05T18:00:00Z'),
        news('infomoney', 'Ibovespa fecha em alta', '2026-10-03T18:00:00Z'),
      ])
    )
    expect(result).toHaveLength(2)
  })

  it('manchetes diferentes ficam todas', () => {
    const result = dedupeHeadlines([
      news('a', 'Selic sobe', '2026-10-05T12:00:00Z'),
      news('b', 'Selic cai', '2026-10-05T12:00:00Z'),
    ])
    expect(result).toHaveLength(2)
  })
})
