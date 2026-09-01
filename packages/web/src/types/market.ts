export type MarketAssetType = "CRYPTO" | "STOCK" | "FIXED_INCOME";

export interface MarketAsset {
  id: string;
  ticker: string;
  name: string;
  type: MarketAssetType;
  price: number;
  change24h: number;
  changePercent?: number;
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
