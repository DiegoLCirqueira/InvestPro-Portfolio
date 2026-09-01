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
}
