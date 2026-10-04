import type { ComboboxOption } from "@/components/ui/combobox";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { MarketAsset } from "@/types/market";
import type { OrderSide, OrderStatus, OrderType, SellableAsset } from "@/types/order";

/** Nome do tipo de ordem na interface (o enum da API fica só no código). */
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  MARKET: "Mercado",
  LIMIT: "Limitada",
  STOP: "Stop",
};

/** Só ordens que ainda não executaram podem ser canceladas (mesma regra do servidor). */
export function isCancellable(status: OrderStatus) {
  return status === "OPEN" || status === "PENDING";
}

// Mesma regra do @investpro/shared (order/order.schema.ts; o web não importa o shared):
// ações e renda fixa só em unidades inteiras na compra; cripto aceita fração.
const WHOLE_QUANTITY_ASSET_TYPES: readonly string[] = ["STOCK", "FIXED_INCOME"];

export function getBuyQuantityError(
  quantity: number,
  asset: MarketAsset | undefined,
): string | null {
  if (
    !asset ||
    Number.isInteger(quantity) ||
    !WHOLE_QUANTITY_ASSET_TYPES.includes(asset.type)
  )
    return null;
  return "Ações e renda fixa só podem ser compradas em quantidade inteira.";
}

// Espelha MIN_ORDER_TOTAL do @investpro/shared: total (quantidade × preço de avaliação, antes
// da taxa) mínimo por ordem. Abaixo disso o arredondamento em centavos criava ou sumia dinheiro.
export const MIN_ORDER_TOTAL = 1;
export const MIN_ORDER_TOTAL_MESSAGE = `O valor mínimo por ordem é ${formatCurrency(MIN_ORDER_TOTAL)}`;

/**
 * Total (já em centavos, como o servidor compara) abaixo do mínimo. Vender a posição inteira é
 * a exceção: senão uma sobra fracionada de cripto ficaria presa para sempre.
 */
export function isBelowMinOrderTotal(total: number, isWholePositionSale: boolean): boolean {
  return !isWholePositionSale && total < MIN_ORDER_TOTAL;
}

// Mesma precisão do @investpro/shared (ORDER_QUANTITY_DECIMAL_PLACES): Order.quantity é Decimal(15,8).
export const ORDER_QUANTITY_DECIMAL_PLACES = 8;
const QUANTITY_SCALE = 10 ** ORDER_QUANTITY_DECIMAL_PLACES;

/**
 * Quantidade que um valor em R$ compra a um preço, truncada em 8 casas: arredondar para cima
 * compraria mais do que o valor informado. O toFixed(4) só limpa o ruído de ponto flutuante
 * (0,3 / 0,1 = 2,9999999999999996) antes de cortar as casas.
 */
export function quantityForAmount(amount: number, price: number): number {
  if (!(amount > 0) || !(price > 0)) return 0;
  const scaled = Number(((amount / price) * QUANTITY_SCALE).toFixed(4));
  return Math.floor(scaled) / QUANTITY_SCALE;
}

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
          toTickerOption(
            asset.ticker,
            `Você possui ${formatQuantity(asset.quantity)}`,
          ),
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

/**
 * Venda acima do que está livre na posição: as vendas abertas do mesmo ativo já reservam parte
 * dela (reservedQuantity, de GET /orders/reservations), como o servidor confere.
 */
export function getSellQuantityError(
  quantity: number,
  ownedQuantity: number | null,
  ticker: string,
  reservedQuantity = 0,
): string | null {
  if (ownedQuantity === null) return null;
  // toFixed: 0,3 − 0,1 dá 0,19999999999999998 e barraria a venda de 0,2.
  const free = Number((ownedQuantity - reservedQuantity).toFixed(ORDER_QUANTITY_DECIMAL_PLACES));
  if (quantity <= free) return null;
  const owned = `Você possui apenas ${formatQuantity(ownedQuantity)} de ${normalizeTicker(ticker)}`;
  return reservedQuantity > 0
    ? `${owned}, e ${formatQuantity(reservedQuantity)} já estão em vendas abertas. Reduza a quantidade.`
    : `${owned}. Reduza a quantidade.`;
}

// Aceita vírgula como separador decimal; devolve null se não for um número
// parcial válido (o input mantém o valor anterior).
export function sanitizeDecimalInput(raw: string): string | null {
  const value = raw.replace(",", ".");
  return value === "" || /^\d*\.?\d*$/.test(value) ? value : null;
}
