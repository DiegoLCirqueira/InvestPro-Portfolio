import type { MarketAsset } from "@/types/market";

// Sem `priceSource` (backend antigo) o preço é tratado como ao vivo: só "seed" avisa.
export const isEstimatedPrice = (asset: MarketAsset): boolean => asset.priceSource === "seed";

export const ESTIMATED_PRICE_ORDER_NOTE = "Preço estimado; o valor executado pode diferir.";
