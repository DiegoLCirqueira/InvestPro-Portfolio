import { useState } from "react";
import { AlertCircle, Plus, Wallet } from "lucide-react";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";
import {
  missingAmount,
  shortfallNote,
  type BalanceShortfall,
} from "@/lib/balance-shortfall";
import { formatCurrency } from "@/lib/format";

// Saldo à vista na compra: a pessoa compara com "Você pagará" enquanto digita, em vez de
// descobrir a falta só depois de enviar.
export function OrderBalance({ available }: { available: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Wallet size={16} aria-hidden="true" />
          Saldo disponível
        </span>
        <strong className="font-semibold tabular-nums">{formatCurrency(available)}</strong>
      </div>
    </div>
  );
}

interface OrderShortfallAlertProps {
  /** Id do aviso: o "Enviar Ordem" desabilitado aponta para ele (aria-describedby). */
  id: string;
  shortfall: BalanceShortfall;
}

// Falta saldo antes de enviar: diz quanto e resolve ali, abrindo o "Adicionar saldo grátis" já
// com o que falta. A conta é a mesma do "Saldo insuficiente" do servidor (balance-shortfall).
// role="status" (educado): o valor muda a cada tecla e um alerta interromperia a digitação.
export function OrderShortfallAlert({ id, shortfall }: OrderShortfallAlertProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const missing = missingAmount(shortfall);

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
            Faltam {formatCurrency(missing)} para esta ordem
          </p>
          <p className="text-xs text-muted-foreground">
            Você pagará {formatCurrency(shortfall.cost)} e tem{" "}
            {formatCurrency(shortfall.available)} em conta.
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
