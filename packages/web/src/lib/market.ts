import type { MarketAsset } from "@/types/market";

// Sem `priceSource` (backend antigo) o preço é tratado como ao vivo: só "seed" avisa.
export const isEstimatedPrice = (asset: MarketAsset): boolean => asset.priceSource === "seed";

export const ESTIMATED_PRICE_ORDER_NOTE = "Preço estimado; o valor executado pode diferir.";

/** Dica (title) dos itens com preço estimado, marcados com borda no tom de aviso. */
export const ESTIMATED_PRICE_TITLE = "Preço estimado: a fonte de cotações está indisponível";

// Nome da empresa/ativo para mostrar abaixo do ticker; null quando a API repete o próprio
// ticker como nome (PETR4 / PETR4 na tabela, "ITUB4 (ITUB4)" nos destaques).
export const assetDisplayName = (asset: MarketAsset): string | null =>
  asset.name.trim().toUpperCase() === asset.ticker.toUpperCase() ? null : asset.name;

/**
 * Rótulo acessível do link de ordem, sem duplicar o ticker quando não há nome. Avisa o preço
 * estimado: o aria-label substitui o conteúdo do link, e a borda amarela é só visual.
 */
export const tradeLinkLabel = (asset: MarketAsset): string => {
  const name = assetDisplayName(asset);
  const label = name ? `Negociar ${asset.ticker} (${name})` : `Negociar ${asset.ticker}`;
  return isEstimatedPrice(asset) ? `${label}, preço estimado` : label;
};
