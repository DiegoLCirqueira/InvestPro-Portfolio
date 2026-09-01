// @investpro/server
// Fontes de notícias CONFIGURÁVEIS (feeds RSS/Atom públicos).
// Para adicionar/remover uma fonte, edite esta lista (const central).

import type { NewsCategory } from './news.domain.js'

export interface NewsSource {
  id: string
  label: string
  url: string
  /** Categoria padrão usada quando a heurística não detecta uma categoria. */
  category: NewsCategory
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'infomoney',
    label: 'InfoMoney',
    url: 'https://www.infomoney.com.br/feed/',
    category: 'MARKET',
  },
  {
    id: 'g1-economia',
    label: 'G1 Economia',
    url: 'https://g1.globo.com/rss/g1/economia/',
    category: 'ECONOMY',
  },
  {
    id: 'investing-brasil',
    label: 'Investing.com Brasil',
    url: 'https://br.investing.com/rss/news.rss',
    category: 'MARKET',
  },
  {
    id: 'coindesk',
    label: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    category: 'CRYPTO',
  },
  {
    id: 'marketwatch',
    label: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    category: 'WORLD',
  },
]

export const NEWS_FETCH_TIMEOUT_MS = 8000