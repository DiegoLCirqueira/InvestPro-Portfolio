import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type { AssetList, MarketAssetType } from "@/types/market";

export type { MarketAsset, MarketAssetType } from "@/types/market";

export interface UseMarketAssetsOptions {
  type?: MarketAssetType;
  initialData?: AssetList;
  enabled?: boolean;
}

export function useMarketAssets({
  type,
  initialData,
  enabled = true,
}: UseMarketAssetsOptions = {}) {
  const query: {
    type?: MarketAssetType;
    search?: string;
    page?: number;
    limit?: number;
  } = { type, page: 1, limit: 100 };

  return useQuery<AssetList>({
    fetcher: () => api.get<AssetList>("/market/assets", query),
    deps: [type],
    initialData,
    enabled,
  });
}
