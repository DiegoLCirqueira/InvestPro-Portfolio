import { formatCurrency } from "@/lib/format";

/** Operação que ficou sem saldo em conta: o que a tela já sabia quando a API recusou. */
export interface BalanceShortfall {
  kind: "order" | "exchange" | "transfer";
  /** Custo total em R$ (com taxa ou tarifa). */
  cost: number;
  /** Saldo em conta que a tela conhecia. */
  available: number;
  /** Ativo da ordem, para a nota do valor pré-preenchido (ex.: "PETR4"). */
  ticker?: string;
  /** Tem tarifa embutida no custo (TED/DOC): a frase diz "custa", não "é de". */
  hasFee?: boolean;
  /** Recarrega o saldo da tela depois de adicionar. */
  onBalanceAdded?: () => void;
}

/** Quanto falta em R$ (centavos exatos), ou 0 se pela conta da tela o saldo bastava. */
export function missingAmount({ cost, available }: BalanceShortfall): number {
  return Math.max(0, Math.round((cost - available) * 100) / 100);
}

// Frase do custo por operação, como no design aprovado (sugestão d).
export function shortfallCostSentence(shortfall: BalanceShortfall): string {
  const cost = formatCurrency(shortfall.cost);
  if (shortfall.kind === "order") return `Esta ordem custa ${cost}`;
  if (shortfall.kind === "exchange") return `A conversão usa ${cost}`;
  return shortfall.hasFee ? `A transferência custa ${cost} com a tarifa` : `A transferência é de ${cost}`;
}

/** Nota sob o campo do "Adicionar saldo grátis" já preenchido com o que falta. */
export function shortfallNote(shortfall: BalanceShortfall): string {
  if (shortfall.kind === "order") {
    return shortfall.ticker
      ? `Valor que falta para a sua ordem de ${shortfall.ticker}.`
      : "Valor que falta para a sua ordem.";
  }
  if (shortfall.kind === "exchange") return "Valor que falta para a sua conversão.";
  return "Valor que falta para a sua transferência.";
}

/** Rótulo da ação que volta ao formulário sem perder o que foi digitado. */
export function shortfallAdjustLabel(shortfall: BalanceShortfall): string {
  return shortfall.kind === "order" ? "Ajustar a ordem" : "Ajustar o valor";
}
