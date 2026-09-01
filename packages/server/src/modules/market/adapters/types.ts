// @investpro/server
// Tipos comuns das fontes de dados de mercado.

export type MarketAssetType = 'CRYPTO' | 'STOCK' | 'FIXED_INCOME'

/** Ativo de referência que uma fonte deve cotar. */
export interface SourceAsset {
  id: string
  ticker: string
  name: string
  type: MarketAssetType
  remoteId?: string
}

/** Ativo base (seed/fallback) com valores estáticos em memória. */
export interface SeedAsset extends SourceAsset {
  source: string
  price: number
  change24h: number
  changePercent?: number
}

/** Cotação normalizada retornada por um adapter. */
export interface MarketQuote {
  ticker: string
  name: string
  type: MarketAssetType
  price: number
  change24h: number
  changePercent?: number
}

/** Contrato comum de uma fonte de dados de mercado (Brapi/CoinGecko/AwesomeAPI). */
export interface MarketDataSource {
  readonly source: string
  /** Busca cotações para os ativos informados. Lança erro se a fonte estiver indisponível. */
  fetchQuotes(assets: SourceAsset[]): Promise<MarketQuote[]>
}