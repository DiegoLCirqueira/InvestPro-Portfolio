export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP";
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";

export interface Order {
  id: string;
  assetId: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price: number | null;
  status: OrderStatus;
  createdAt: string;
  executedAt: string | null;
  avgPrice: number | null;
  // Taxa InvestPro; null enquanto a ordem não foi executada.
  fee?: number | null;
  // R$ resgatados da Caixinha para pagar a compra (só na resposta do POST; 0/ausente se não usou).
  savingsBoxUsed?: number;
}

export interface OrderList {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOrderInput {
  assetId?: string;
  ticker?: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  type: OrderType;
  // Só compra: se o saldo em conta não bastar, o servidor resgata a diferença da Caixinha na
  // mesma transação. O site nunca envia em venda.
  useSavingsBox?: boolean;
}

export interface SellableAsset {
  ticker: string;
  quantity: number;
}

export interface SellableAssetList {
  items: SellableAsset[];
}

// GET /orders/reservations: o que as ordens abertas (OPEN) já prometeram. balance = custo das
// compras abertas (preço + 1%); positions = quantidade em vendas abertas, por ticker.
export interface OrderReservations {
  balance: number;
  positions: Record<string, number>;
}
