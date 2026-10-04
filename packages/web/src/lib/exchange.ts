import type {
  ConvertResponse,
  ExchangeSummary,
  ExecuteExchangeResponse,
} from "@/types/exchange";

// Mínimo por conversão, em BRL (espelha MIN_EXCHANGE_BRL do @investpro/shared): como nas ordens,
// evita fatiar o câmbio em valores tão pequenos que a taxa de 1% arredonda para zero.
export const MIN_EXCHANGE_BRL = 1;
export const MIN_EXCHANGE_MESSAGE = "O valor mínimo por conversão é R$ 1,00";

/**
 * O valor de origem, em BRL, fica abaixo do mínimo? BRL de origem é o próprio valor; moeda
 * estrangeira usa a cotação da simulação (só quando o destino é BRL, a única que a tela conhece).
 * Sem como saber (estrangeira → estrangeira), quem decide é o servidor.
 */
export function isBelowExchangeMinimum(summary: { from: string; to: string; amount: number; rate: number }) {
  if (summary.from === "BRL") return summary.amount < MIN_EXCHANGE_BRL;
  if (summary.to === "BRL") return summary.amount * summary.rate < MIN_EXCHANGE_BRL;
  return false;
}

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
