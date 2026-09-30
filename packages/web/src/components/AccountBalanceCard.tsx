import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const FREE_NOTE_ID = "account-balance-free-note";

interface AccountBalanceCardProps {
  /** Dinheiro livre em conta (caixa em BRL): o que dá pra usar em ordens, câmbio e transferências. */
  availableBalance: number;
  /** Chamado depois de um depósito, para o Painel recarregar saldo e gráfico. */
  onBalanceChange?: () => void;
}

// Destaque principal do Painel: o saldo em conta. O patrimônio total (que
// soma investimentos, caixinha e moedas) fica no rodapé de "Seus Ativos" —
// como número principal, ele dava a ilusão de que tudo era dinheiro livre.
// "Adicionar saldo" fica aqui, onde a pessoa olha o saldo (antes só existia no
// Perfil), com o "grátis" como legenda colada ao botão em vez de perdido no fim da
// descrição. No desktop: valor e botão na mesma linha, descrição e legenda embaixo.
// No celular: valor, descrição, botão em largura total e a legenda centralizada.
export function AccountBalanceCard({
  availableBalance,
  onBalanceChange,
}: AccountBalanceCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  return (
    <div
      className={cn(
        cardClassName,
        "grid grid-cols-1 gap-y-2 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-x-6",
      )}
    >
      <div>
        <p className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1">
          <Wallet size={16} aria-hidden="true" />
          Saldo em conta
        </p>
        <h3 className="text-3xl font-bold text-foreground tracking-tight tabular-nums">
          {formatCurrency(availableBalance)}
        </h3>
      </div>
      <Button
        onClick={() => setIsTopUpOpen(true)}
        aria-describedby={FREE_NOTE_ID}
        className="order-3 mt-2 w-full sm:order-none sm:mt-0 sm:w-auto sm:self-end"
      >
        <Plus aria-hidden="true" />
        Adicionar saldo
      </Button>
      <p className="order-2 text-xs text-muted-foreground sm:order-none">
        Disponível para investir, transferir e fazer câmbio.
      </p>
      <p
        id={FREE_NOTE_ID}
        className="order-4 text-center text-xs font-semibold text-primary sm:order-none"
      >
        Grátis · dinheiro simulado
      </p>

      <TopUpDialog
        open={isTopUpOpen}
        onOpenChange={setIsTopUpOpen}
        onSuccess={onBalanceChange}
      />
    </div>
  );
}
