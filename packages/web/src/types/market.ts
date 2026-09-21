export type MarketAssetType = "CRYPTO" | "STOCK" | "FIXED_INCOME";

// "seed" = preço de referência estimado (a fonte de cotações estava indisponível). Ausente = ao vivo.
export type PriceSource = "live" | "seed";

export interface MarketAsset {
  id: string;
  ticker: string;
  name: string;
  type: MarketAssetType;
  price: number;
  change24h: number;
  changePercent?: number;
  priceSource?: PriceSource;
}

export interface AssetList {
  items: MarketAsset[];
  total: number;
  page: number;
  limit: number;
}

export interface AssetQuery {
  type?: MarketAssetType;
  search?: string;
  page?: number;
  limit?: number;
}
