import type {
  ConvertResponse,
  ExchangeSummary,
  ExecuteExchangeResponse,
} from "@/types/exchange";

// Identifica "o que foi simulado": se algo aqui muda, a simulação deixa de valer.
export function quoteKey(from: string, to: string, amount: number): string {
  return `${from}|${to}|${amount}`;
}

export function summaryFromQuote(quote: ConvertResponse): ExchangeSummary {
  return {
    from: quote.from,
    to: quote.to,
    amount: quote.amount,
    convertedAmount: quote.convertedAmount,
    rate: quote.rate,
    fee: quote.fee,
    at: quote.timestamp,
  };
}

export function summaryFromExecution(execution: ExecuteExchangeResponse): ExchangeSummary {
  return {
    from: execution.fromCurrency,
    to: execution.toCurrency,
    amount: execution.amount,
    convertedAmount: execution.convertedAmount,
    rate: execution.rate,
    fee: execution.fee,
    at: execution.createdAt,
  };
}
