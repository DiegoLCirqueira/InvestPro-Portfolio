import type { ComboboxOption } from "@/components/ui/combobox";
import { formatQuantity } from "@/lib/format";
import type { MarketAsset } from "@/types/market";
import type { OrderSide, SellableAsset } from "@/types/order";

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function toTickerOption(ticker: string, description: string): ComboboxOption {
  return { value: ticker, label: ticker, description };
}

// BUY escolhe do catálogo de mercado; SELL só do que o usuário possui.
export function buildTickerOptions(
  side: OrderSide,
  marketAssets: MarketAsset[],
  sellableAssets: SellableAsset[],
): ComboboxOption[] {
  const options =
    side === "SELL"
      ? sellableAssets.map((asset) =>
          toTickerOption(asset.ticker, `Você possui ${formatQuantity(asset.quantity)}`),
        )
      : marketAssets.map((asset) => toTickerOption(asset.ticker, asset.name));
  return options.sort((a, b) => a.value.localeCompare(b.value));
}

export function findOwnedQuantity(
  sellableAssets: SellableAsset[],
  ticker: string,
): number | null {
  const normalized = normalizeTicker(ticker);
  const owned = sellableAssets.find(
    (asset) => normalizeTicker(asset.ticker) === normalized,
  );
  return owned?.quantity ?? null;
}

export function getSellQuantityError(
  quantity: number,
  ownedQuantity: number | null,
  ticker: string,
): string | null {
  if (ownedQuantity === null || quantity <= ownedQuantity) return null;
  return `Você possui apenas ${formatQuantity(ownedQuantity)} de ${normalizeTicker(ticker)}. Reduza a quantidade.`;
}

// Aceita vírgula como separador decimal; devolve null se não for um número
// parcial válido (o input mantém o valor anterior).
export function sanitizeDecimalInput(raw: string): string | null {
  const value = raw.replace(",", ".");
  return value === "" || /^\d*\.?\d*$/.test(value) ? value : null;
}
