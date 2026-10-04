import { useId, useState } from "react";
import { AlertCircle, Clock, Info, PiggyBank, Plus, Wallet } from "lucide-react";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";
import {
  missingAmount,
  savingsBoxDraw,
  shortfallHoldings,
  shortfallNote,
  type BalanceShortfall,
} from "@/lib/balance-shortfall";
import { formatCurrency } from "@/lib/format";

interface SavingsBoxOption {
  balance: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

interface OrderBalanceProps {
  available: number;
  /** Compra LIMIT/STOP: o que as outras compras abertas já reservam (fora do disponível). */
  reserved?: number;
  /** Só na compra e só com dinheiro na Caixinha; null esconde a linha e o checkbox. */
  savingsBox: SavingsBoxOption | null;
}

// Saldo à vista: a pessoa compara com "Você pagará" enquanto digita, em vez de descobrir a
// falta só depois de enviar. Na compra, a Caixinha pode cobrir o que faltar.
export function OrderBalance({ available, reserved = 0, savingsBox }: OrderBalanceProps) {
  const checkboxId = useId();

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background px-4 py-3 text-sm">
      <BalanceRow icon={Wallet} label="Saldo disponível" value={available} />
      {/* Explica por que o disponível é menor que o Saldo em conta do Painel. */}
      {reserved > 0 && (
        <BalanceRow icon={Clock} label="Reservado em ordens abertas" value={reserved} />
      )}
      {savingsBox && (
        <>
          <BalanceRow icon={PiggyBank} label="Na Caixinha" value={savingsBox.balance} />
          <div className="mt-1 grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 border-t border-border pt-1">
            <input
              id={checkboxId}
              type="checkbox"
              checked={savingsBox.enabled}
              onChange={(e) => savingsBox.onEnabledChange(e.target.checked)}
              className="mt-3 size-5 cursor-pointer accent-primary"
            />
            {/* O rótulo inteiro é o alvo de toque (>= 44px), não só a caixinha de 20px. */}
            <label htmlFor={checkboxId} className="flex min-h-11 cursor-pointer flex-col justify-center">
              <span className="font-semibold">Usar saldo da Caixinha se faltar</span>
              <span className="text-xs text-muted-foreground">
                Resgata só o que faltar, na mesma operação.
              </span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function BalanceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon size={16} aria-hidden="true" />
        {label}
      </span>
      <strong className="font-semibold tabular-nums">{formatCurrency(value)}</strong>
    </div>
  );
}

// Compra com a Caixinha marcada e saldo em conta suficiente: diz que ela fica de fora.
export function OrderAccountOnlyNote() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Info size={16} aria-hidden="true" />
      Tudo sai do Saldo em conta. A Caixinha não é usada.
    </p>
  );
}

// Falta em conta e a Caixinha cobre: mostra de onde sai cada parte e quanto sobra nela.
// O envio continua ativo: o servidor resgata a diferença e compra numa operação só.
export function OrderPaymentSplit({ shortfall }: { shortfall: BalanceShortfall }) {
  const fromSavingsBox = savingsBoxDraw(shortfall);
  const fromAccount = shortfall.cost - fromSavingsBox;

  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3.5 text-sm text-foreground"
    >
      <p className="mb-0.5 font-bold">Como esta compra será paga</p>
      <dl className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-3">
          <dt>Do Saldo em conta</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(fromAccount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Da Caixinha</dt>
          <dd className="font-semibold tabular-nums">+ {formatCurrency(fromSavingsBox)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-brand-primary/30 pt-1.5">
          <dt className="font-bold">Total</dt>
          <dd className="font-bold tabular-nums">{formatCurrency(shortfall.cost)}</dd>
        </div>
      </dl>
      <p className="mt-0.5 text-xs">
        A Caixinha fica com {formatCurrency((shortfall.savingsBox ?? 0) - fromSavingsBox)}.
      </p>
    </div>
  );
}

interface OrderShortfallAlertProps {
  /** Id do aviso: o "Enviar Ordem" desabilitado aponta para ele (aria-describedby). */
  id: string;
  shortfall: BalanceShortfall;
}

// Falta saldo antes de enviar (mesmo somando a Caixinha, quando ela entra): diz quanto e
// resolve ali, abrindo o "Adicionar saldo grátis" já com o que falta. A conta é a mesma do
// "Saldo insuficiente" do servidor (balance-shortfall).
// role="status" (educado): o valor muda a cada tecla e um alerta interromperia a digitação.
export function OrderShortfallAlert({ id, shortfall }: OrderShortfallAlertProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const missing = missingAmount(shortfall);
  const usesSavingsBox = Boolean(shortfall.savingsBox);
  const cost = formatCurrency(shortfall.cost);

  return (
    <div
      id={id}
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5"
    >
      <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5">
        <AlertCircle size={20} aria-hidden="true" className="mt-px text-destructive" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold text-destructive">
            Faltam {formatCurrency(missing)}
            {usesSavingsBox ? ", mesmo usando a Caixinha" : " para esta ordem"}
          </p>
          <p className="text-xs text-muted-foreground">
            {usesSavingsBox
              ? `Você pagará ${cost}; tem ${shortfallHoldings(shortfall)}.`
              : `Você pagará ${cost} e tem ${shortfallHoldings(shortfall)}.`}
          </p>
        </div>
      </div>
      <Button type="button" className="w-full" onClick={() => setIsTopUpOpen(true)}>
        <Plus aria-hidden="true" />
        Adicionar saldo grátis
      </Button>

      <TopUpDialog
        open={isTopUpOpen}
        onOpenChange={setIsTopUpOpen}
        initialAmount={missing}
        note={shortfallNote(shortfall)}
        onSuccess={shortfall.onBalanceAdded}
      />
    </div>
  );
}
