import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { MoneyCard } from "@/components/MoneyCard";
import { TopUpDialog } from "@/components/TopUpDialog";
import { Button } from "@/components/ui/button";

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
// Perfil), com o "grátis" como legenda colada ao botão. No celular o botão ocupa a
// largura toda e a legenda fica centralizada embaixo dele.
export function AccountBalanceCard({
  availableBalance,
  onBalanceChange,
}: AccountBalanceCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  return (
    <MoneyCard
      icon={Wallet}
      label="Saldo em conta"
      value={availableBalance}
      description="Disponível para investir, transferir e fazer câmbio."
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          onClick={() => setIsTopUpOpen(true)}
          aria-describedby={FREE_NOTE_ID}
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden="true" />
          Adicionar saldo
        </Button>
        <p
          id={FREE_NOTE_ID}
          className="w-full text-center text-xs font-semibold text-primary sm:w-auto"
        >
          Grátis · dinheiro simulado
        </p>
      </div>

      <TopUpDialog
        open={isTopUpOpen}
        onOpenChange={setIsTopUpOpen}
        onSuccess={onBalanceChange}
      />
    </MoneyCard>
  );
}
