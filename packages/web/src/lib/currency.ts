const CURRENCY_NAMES: Record<string, string> = {
  BRL: "Real Brasileiro",
  USD: "Dólar Americano",
  EUR: "Euro",
  GBP: "Libra Esterlina",
  JPY: "Iene Japonês",
  CHF: "Franco Suíço",
  CAD: "Dólar Canadense",
  AUD: "Dólar Australiano",
  CNY: "Yuan Chinês",
};

export function currencyName(code: string): string {
  return CURRENCY_NAMES[code] ?? code;
}
