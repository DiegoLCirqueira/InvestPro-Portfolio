// Eixo Y em pt-BR, com as casas que a variação do período pede: com variação pequena
// (menos de R$ 50), reais inteiros repetiriam o mesmo rótulo ("R$ 10.000" três vezes), então
// mostra os centavos. Acima de 1 milhão abrevia ("R$ 3,01 mi") só se a variação for grande o
// bastante para os rótulos abreviados continuarem diferentes.
export function axisCurrencyFormatter(min: number, max: number) {
  const span = max - min;
  const useCompact = Math.abs(max) >= 1_000_000 && span >= 100_000;
  const decimals = useCompact || span < 50 ? 2 : 0;
  const format = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(useCompact ? { notation: "compact" as const } : {}),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return {
    format: (value: number) => format.format(value),
    /** Largura do eixo: com centavos o rótulo fica mais longo. */
    width: decimals > 0 && !useCompact ? 92 : 76,
  };
}
