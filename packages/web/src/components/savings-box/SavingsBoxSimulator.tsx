import { useId, useState, type MouseEvent } from "react";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField } from "@/components/FormField";
import { SectionTitle } from "@/components/SectionTitle";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { segmentClassName } from "@/components/ui/segmented";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  initialSimulationAmount,
  SIMULATION_MONTHS,
  simulateYield,
  type SimulationMonths,
} from "@/lib/savings-box";
import { cn } from "@/lib/utils";

const MONTH_LABELS: Record<SimulationMonths, string> = {
  1: "1 mês",
  6: "6 meses",
  12: "12 meses",
};

interface SavingsBoxSimulatorProps {
  balance: number;
  rate: number;
  /** Saldo em conta livre: o depósito sugerido não pode passar dele. */
  freeAccount: number;
  reserved: number;
  /** Abre o diálogo de depósito com o valor simulado já preenchido. */
  onDeposit: (event: MouseEvent<HTMLButtonElement>, amount: number) => void;
}

/** [B] Quanto rende: compara o valor na Caixinha com o mesmo valor parado na conta. */
export function SavingsBoxSimulator({
  balance,
  rate,
  freeAccount,
  reserved,
  onDeposit,
}: SavingsBoxSimulatorProps) {
  const limitNoteId = useId();
  // O valor inicial vale só na montagem: depois é do usuário (um depósito não sobrescreve).
  const amountInput = useCurrencyDigitsInput({
    initialAmount: initialSimulationAmount(balance, freeAccount),
  });
  const [months, setMonths] = useState<SimulationMonths>(12);

  const amount = amountInput.amount;
  const yieldAmount = simulateYield(amount, rate, months);
  const total = amount + yieldAmount;
  const exceedsAccount = amount > freeAccount;
  const where = reserved > 0 ? "livres em conta" : "em conta";
  const ratePct = formatPercent(rate * 100, { decimals: 0 });
  const disabledReason = exceedsAccount
    ? `Você tem ${formatCurrency(freeAccount)} ${where}.`
    : amount <= 0
      ? "Informe o valor a simular."
      : null;

  return (
    <section
      aria-labelledby="caixinha-simulador"
      className={cn(cardClassName, "nav:col-span-3 flex flex-col gap-5")}
    >
      <SectionTitle id="caixinha-simulador">Quanto rende</SectionTitle>

      <FormField label="Valor">
        <CurrencyDigitsField input={amountInput} ariaLabel="Valor a simular" />
      </FormField>

      <div role="group" aria-labelledby="caixinha-periodo" className="flex flex-col gap-2">
        <span id="caixinha-periodo" className="text-sm text-muted-foreground">
          Período
        </span>
        <div className="grid grid-cols-3 gap-2">
          {SIMULATION_MONTHS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={months === option}
              onClick={() => setMonths(option)}
              className={segmentClassName(months === option)}
            >
              {MONTH_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Os números estão no texto; as barras só dão a proporção (aria-hidden). */}
      <dl aria-live="polite" className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-muted-foreground">Na Caixinha</dt>
            <dd className="tabular-nums">
              <span className="font-semibold">{formatCurrency(total)}</span>{" "}
              <span className="text-primary">(+{formatCurrency(yieldAmount)})</span>
            </dd>
          </div>
          <div className="h-2 rounded-full bg-primary" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-muted-foreground">Parado no Saldo em conta</dt>
            <dd className="tabular-nums">
              <span className="font-semibold">{formatCurrency(amount)}</span>{" "}
              <span className="text-muted-foreground">(+{formatCurrency(0)})</span>
            </dd>
          </div>
          <div
            className="h-2 rounded-full bg-border-strong transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${total > 0 ? (amount / total) * 100 : 100}%` }}
            aria-hidden="true"
          />
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        Simulação com juros simples de {ratePct} ao ano, a mesma regra da Caixinha do InvestPro.
        Não é promessa de rendimento.
      </p>

      <div className="flex flex-col gap-2">
        <Button
          onClick={(event) => onDeposit(event, amount)}
          disabled={disabledReason !== null}
          aria-describedby={disabledReason ? limitNoteId : undefined}
          className="sm:self-start"
        >
          {amount > 0 ? `Depositar ${formatCurrency(amount)}` : "Depositar"}
        </Button>
        {/* Desabilitado sempre com o motivo visível (mesma regra do diálogo). */}
        {disabledReason && (
          <p
            id={limitNoteId}
            className={cn("text-xs", exceedsAccount ? "text-destructive" : "text-muted-foreground")}
          >
            {disabledReason}
          </p>
        )}
      </div>
    </section>
  );
}
