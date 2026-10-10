// @investpro/server
// getNews de ponta a ponta com os feeds RSS mockados (sem rede): a mesma
// manchete vinda de duas fontes aparece uma vez só, e resumo igual ao título
// sai vazio.

import { describe, expect, it, vi } from 'vitest'
import type { RawNewsItem } from '../adapters/rss.js'
import { NEWS_SOURCES } from '../sources.js'

const FEEDS: Record<string, RawNewsItem[]> = {
  infomoney: [
    {
      guid: 'im-1',
      title: 'Furacão Isaias deixa 2 mortos e milhares sem energia elétrica nos EUA',
      description: 'Furacão Isaias deixa 2 mortos e milhares sem energia elétrica nos EUA',
      url: 'https://www.infomoney.com.br/mundo/furacao-isaias',
      publishedAt: '2026-10-05T13:40:00.000Z',
    },
    {
      guid: 'im-2',
      title: 'Ibovespa fecha em alta com bancos',
      description: 'Bolsa sobe puxada pelo setor financeiro.',
      url: 'https://www.infomoney.com.br/mercados/ibovespa',
      publishedAt: '2026-10-05T18:00:00.000Z',
    },
  ],
  'investing-brasil': [
    {
      guid: 'inv-1',
      title: 'Furacão Isaías deixa 2 mortos e milhares sem energia elétrica nos EUA.',
      description: 'Tempestade atinge a costa leste dos Estados Unidos e derruba a rede.',
      url: 'https://br.investing.com/news/furacao-isaias',
      publishedAt: '2026-10-05T12:49:00.000Z',
    },
  ],
}

vi.mock('../adapters/rss.js', () => ({
  // O "xml" é a própria URL; o parseFeed devolve os itens daquela fonte.
  fetchFeedXml: async (url: string) => url,
  parseFeed: (url: string) => FEEDS[NEWS_SOURCES.find((s) => s.url === url)?.id ?? ''] ?? [],
}))

import { getNews } from '../news.service.js'

describe('getNews', () => {
  it('agrupa a mesma manchete de fontes diferentes e esconde o resumo repetido', async () => {
    const { items, total } = await getNews({ page: 1, limit: 20 })

    expect(total).toBe(2)
    const hurricane = items.filter((item) => item.title.startsWith('Furacão'))
    // Fica a que tem resumo de verdade (a da InfoMoney só repetia o título).
    expect(hurricane).toEqual([
      expect.objectContaining({ source: 'Investing.com Brasil', summary: expect.stringContaining('costa leste') }),
    ])
  })
})
