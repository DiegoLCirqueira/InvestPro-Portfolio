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

export interface ConvertRequest {
  from: string;
  to: string;
  amount: number;
}

// Simulação (POST /exchange/convert): nada é debitado.
export interface ConvertResponse {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  // Na moeda de origem.
  fee: number;
  timestamp: string;
}

// Forma única para exibir tanto a simulação quanto a conversão executada.
export interface ExchangeSummary {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  fee: number;
  at: string;
}
