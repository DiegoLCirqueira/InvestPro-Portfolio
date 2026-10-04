import { formatCurrency } from "@/lib/format";

/** Operação que ficou sem saldo em conta: o que a tela já sabia quando a API recusou. */
export interface BalanceShortfall {
  kind: "order" | "exchange" | "transfer";
  /** Custo total em R$ (com taxa ou tarifa). */
  cost: number;
  /** Saldo em conta livre que a tela conhecia (já sem o reservado em ordens abertas). */
  available: number;
  /** Ordem LIMIT/STOP: R$ que as outras compras abertas já reservam do saldo em conta. */
  reserved?: number;
  /** Ativo da ordem, para a nota do valor pré-preenchido (ex.: "PETR4"). */
  ticker?: string;
  /** Tem tarifa embutida no custo (TED/DOC): a frase diz "custa", não "é de". */
  hasFee?: boolean;
  /** Compra que pode usar a Caixinha: quanto há nela para cobrir o que faltar em conta. */
  savingsBox?: number;
  /** Recarrega o saldo da tela depois de adicionar. */
  onBalanceAdded?: () => void;
}

const toCents = (value: number) => Math.round(value * 100) / 100;

/** Quanto falta em conta (centavos exatos), antes de contar a Caixinha. */
function accountGap({ cost, available }: BalanceShortfall): number {
  return Math.max(0, toCents(cost - available));
}

/** Quanto falta em R$ (centavos exatos), já contando a Caixinha; 0 se pela conta da tela bastava. */
export function missingAmount(shortfall: BalanceShortfall): number {
  return Math.max(0, toCents(accountGap(shortfall) - (shortfall.savingsBox ?? 0)));
}

/** Quanto sai da Caixinha: só a diferença que falta em conta, nunca mais do que há nela. */
export function savingsBoxDraw(shortfall: BalanceShortfall): number {
  return Math.min(accountGap(shortfall), shortfall.savingsBox ?? 0);
}

/**
 * O que a pessoa tem: "R$ 550,00 em conta" e, se a Caixinha conta, "e R$ 3.000,00 na Caixinha".
 * Com ordens abertas reservando saldo, diz que o valor é o livre e quanto está reservado (senão
 * "Faltam R$ X" contradiria o saldo que ela vê no Painel).
 */
export function shortfallHoldings({ available, savingsBox, reserved }: BalanceShortfall): string {
  const account = reserved
    ? `${formatCurrency(available)} livres em conta (${formatCurrency(reserved)} reservados em ordens abertas)`
    : `${formatCurrency(available)} em conta`;
  return savingsBox ? `${account} e ${formatCurrency(savingsBox)} na Caixinha` : account;
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
