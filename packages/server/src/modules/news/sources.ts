// @investpro/server
// Fontes de notícias CONFIGURÁVEIS (feeds RSS/Atom públicos).
// Para adicionar/remover uma fonte, edite esta lista (const central).

import type { NewsCategory } from './news.domain.js'

export interface NewsSource {
  id: string
  label: string
  url: string
  /** Categoria padrão. Só é usada de fato quando alwaysInclude é true e nenhuma keyword bateu. */
  category: NewsCategory
  /**
   * Mantém itens da fonte mesmo sem nenhuma keyword financeira batendo
   * (WI-29). Exceção permanente pra CoinDesk: cripto em português tem pouca
   * cobertura, então exigir keyword aqui descartaria cobertura legítima.
   */
  alwaysInclude?: boolean
  /**
   * Restringe as categorias aceitas desta fonte, além do filtro geral de
   * relevância (WI-29). MarketWatch é feed generalista de "world/economia"
   * em inglês — sem isso, notícias fora de mercado/macro (ex: matérias de
   * interesse humano) passavam com a categoria WORLD genérica.
   */
  requiredCategories?: NewsCategory[]
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
    alwaysInclude: true,
  },
  {
    id: 'marketwatch',
    label: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    category: 'WORLD',
    requiredCategories: ['MARKET', 'MACRO'],
  },
]

export const NEWS_FETCH_TIMEOUT_MS = 8000