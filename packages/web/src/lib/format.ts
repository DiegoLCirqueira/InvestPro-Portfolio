export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Preço unitário de execução: o servidor guarda até 8 casas (ex. cotação 4,9918), e arredondar
 * para 2 fazia preço × quantidade não bater com o débito. Mostra até 4, sem zeros sobrando
 * (4,99 continua 4,99). Valores totais seguem no formatCurrency.
 */
export function formatUnitPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/** Número em formato pt-BR (vírgula decimal, ponto de milhar) com casas fixas. */
export function formatDecimal(value: number, decimals = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Percentual já em pontos (1.5 → "1,50%"). Com showSign, só positivos ganham "+": zero não é alta. */
export function formatPercent(
  value: number,
  options?: { decimals?: number; showSign?: boolean },
): string {
  const decimals = options?.decimals ?? 2;
  const showSign = options?.showSign ?? false;
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value, decimals)}%`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

/** "dd/mm/aaaa, hh:mm": data e hora sem os segundos (extratos). */
export function formatDateTimeMinutes(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** "setembro de 2026": mês por extenso e ano. */
export function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(
    value,
  );
}

export function formatExchangeRate(rate: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);
}
