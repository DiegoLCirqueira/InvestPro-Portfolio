import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface AccountBalanceCardProps {
  /** Dinheiro livre em conta (caixa em BRL): o que dá pra usar em ordens, câmbio e transferências. */
  availableBalance: number;
}

// Destaque principal do Painel: o saldo em conta. O patrimônio total (que
// soma investimentos, caixinha e moedas) fica no rodapé de "Seus Ativos" —
// como número principal, ele dava a ilusão de que tudo era dinheiro livre.
export function AccountBalanceCard({
  availableBalance,
}: AccountBalanceCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-surface-1">
      <p className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1">
        <Wallet size={16} aria-hidden="true" />
        Saldo em conta
      </p>
      <h3 className="text-3xl font-bold text-foreground tracking-tight tabular-nums">
        {formatCurrency(availableBalance)}
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">
        Disponível para investir, transferir e fazer câmbio.
      </p>
    </div>
  );
}
