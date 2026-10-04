import type { MouseEvent, Ref } from "react";
import { PiggyBank } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ReservedBalanceNote } from "@/components/ReservedBalanceNote";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { formatSavingsShare, savingsShare } from "@/lib/savings-box";
import { cn } from "@/lib/utils";

type OpenHandler = (event: MouseEvent<HTMLButtonElement>) => void;

interface SavingsBoxSummaryProps {
  balance: number;
  /** Taxa anual da simulação (0,06 = 6%). */
  rate: number;
  /** Saldo em conta LIVRE: o reservado em ordens abertas não está "parado", está prometido. */
  freeAccount: number;
  reserved: number;
  onDeposit: OpenHandler;
  onWithdraw: OpenHandler;
  /** Vazia: abre o primeiro depósito (é outro botão, que some quando a Caixinha enche). */
  onFirstDeposit: OpenHandler;
  /** Vazia e sem saldo em conta: abre o "Adicionar saldo grátis" do Painel. */
  onTopUp: OpenHandler;
  depositRef?: Ref<HTMLButtonElement>;
}

/** [A] Resumo: quanto está guardado, quanto do dinheiro livre está rendendo e quanto rende. */
export function SavingsBoxSummary({
  balance,
  rate,
  freeAccount,
  reserved,
  onDeposit,
  onWithdraw,
  onFirstDeposit,
  onTopUp,
  depositRef,
}: SavingsBoxSummaryProps) {
  const isEmpty = balance <= 0;
  const share = savingsShare(balance, freeAccount);
  const shareLabel = formatSavingsShare(share);

  return (
    <section
      aria-labelledby="caixinha-resumo"
      className={cn(cardClassName, "nav:col-span-5 flex flex-col gap-5")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2
            id="caixinha-resumo"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <PiggyBank size={16} aria-hidden="true" />
            Guardado na Caixinha
          </h2>
          {!isEmpty && (
            <>
              <p className="text-3xl nav:text-4xl font-bold tracking-tight tabular-nums text-primary">
                {formatCurrency(balance)}
              </p>
              <p className="text-sm text-muted-foreground">
                100% do CDI · {formatPercent(rate * 100, { decimals: 0 })} ao ano na simulação
              </p>
            </>
          )}
        </div>
        {!isEmpty && (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button ref={depositRef} onClick={onDeposit}>
              Depositar
            </Button>
            <Button variant="outline" onClick={onWithdraw}>
              Resgatar
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        // Vazia: convite no lugar do valor zerado, sem Resgatar. Sem saldo em conta, o primeiro
        // passo é adicionar saldo (é simulado e grátis). Um EmptyState só, mudando o texto: depois
        // do saldo grátis o mesmo botão vira "Fazer o primeiro depósito" e o foco continua nele.
        <EmptyState
          icon={PiggyBank}
          title="Sua Caixinha está vazia"
          message={
            freeAccount > 0
              ? "Guarde parte do Saldo em conta e ele passa a render 100% do CDI na simulação."
              : "Adicione saldo grátis e depois guarde uma parte aqui."
          }
          action={
            freeAccount > 0
              ? { label: "Fazer o primeiro depósito", onClick: onFirstDeposit }
              : { label: "Adicionar saldo grátis", onClick: onTopUp }
          }
          className="py-6"
        />
      ) : (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Seu dinheiro livre</span>
            <span className="font-semibold text-primary">{shareLabel} rendendo</span>
          </div>
          {/* Os números estão na legenda: a barra só resume (por isso role="img" com o texto). */}
          <div
            role="img"
            aria-label={`${shareLabel} do seu dinheiro livre está na Caixinha`}
            className="h-3 overflow-hidden rounded-full border border-border bg-secondary"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${share}%` }}
            />
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="text-muted-foreground">Na Caixinha</span>
              <span className="font-semibold tabular-nums">{formatCurrency(balance)}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full border border-border-strong" aria-hidden="true" />
              <span className="text-muted-foreground">Parado no Saldo em conta</span>
              <span className="font-semibold tabular-nums">{formatCurrency(freeAccount)}</span>
            </li>
          </ul>
          <ReservedBalanceNote reserved={reserved} />
          <p className="text-sm text-muted-foreground">
            Rende cerca de{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency((balance * rate) / 12)}
            </span>{" "}
            por mês (simulação).
          </p>
        </div>
      )}
    </section>
  );
}
