import { formatCurrency } from "@/lib/format";
import { transferCost, transferFee } from "@/lib/transfer-fee";
import type { NewTransferType } from "@/types/transfer";

interface TransferSummaryProps {
  type: NewTransferType;
  amount: number;
}

// Mesmo padrão do resumo de Ordens ("Taxa" / "Você pagará"): a tarifa da TED sai do saldo junto
// com o valor, e antes só aparecia depois, no "saldo insuficiente". O PIX mostra a tarifa zero.
export function TransferSummary({ type, amount }: TransferSummaryProps) {
  return (
    <dl className="flex flex-col gap-2 text-sm" aria-live="polite">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Tarifa</dt>
        <dd className="text-foreground font-semibold tabular-nums">
          {formatCurrency(transferFee(type))}
        </dd>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <dt className="text-foreground font-bold">Total</dt>
        <dd className="text-lg font-bold tabular-nums text-brand-primary">
          {amount > 0 ? formatCurrency(transferCost(type, amount)) : "—"}
        </dd>
      </div>
    </dl>
  );
}
