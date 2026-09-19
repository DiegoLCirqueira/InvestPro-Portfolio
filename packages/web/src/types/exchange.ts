export interface CurrencyListResponse {
  base: string;
  items: string[];
}

export interface ExecuteExchangeInput {
  from: string;
  to: string;
  amount: number;
}

export interface ExecuteExchangeResponse {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  // Na moeda de origem (fromCurrency).
  fee: number;
  createdAt: string;
}

export interface CurrencyHolding {
  currency: string;
  balance: number;
}

export interface CurrencyHoldingList {
  items: CurrencyHolding[];
}
