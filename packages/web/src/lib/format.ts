export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
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
