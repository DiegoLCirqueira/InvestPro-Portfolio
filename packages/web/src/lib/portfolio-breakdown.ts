export interface PortfolioBreakdownItem {
  label: string;
  value: number;
}

interface PortfolioBreakdownInput {
  /** Patrimônio total do servidor (caixa + posições + Caixinha + moedas em BRL). */
  totalEquity: number;
  /** Saldo em conta (caixa). */
  cash: number;
  /** Valor atual de cada posição (a lista de "Seus Ativos"). */
  positionValues: readonly number[];
  savingsBox: number;
}

const toCents = (value: number) => Math.round(value * 100);

/**
 * Partes do "Valor total do portfólio": o Painel mostra só o caixa e os ativos, e a Caixinha e as
 * moedas ficavam invisíveis dentro do total. Moedas = total − as outras três (em centavos): o site
 * não tem a cotação que o servidor usou, e assim as partes somam exatamente o total. Se a conta
 * der negativa, os dados vieram de momentos diferentes (ex.: depósito no meio): null, até recarregar.
 */
export function portfolioBreakdown({
  totalEquity,
  cash,
  positionValues,
  savingsBox,
}: PortfolioBreakdownInput): PortfolioBreakdownItem[] | null {
  const investments = positionValues.reduce((sum, value) => sum + toCents(value), 0);
  const known = toCents(cash) + investments + toCents(savingsBox);
  const currencies = toCents(totalEquity) - known;
  if (currencies < 0) return null;

  return [
    { label: "Saldo em conta", value: cash },
    { label: "Investimentos", value: investments / 100 },
    { label: "Caixinha", value: savingsBox },
    { label: "Moedas", value: currencies / 100 },
  ];
}
