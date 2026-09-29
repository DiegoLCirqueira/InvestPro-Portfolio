import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { TopUpForm } from "@/components/profile/TopUpForm";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

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
// Perfil) e diz com todas as letras que é grátis: é dinheiro simulado.
export function AccountBalanceCard({
  availableBalance,
  onBalanceChange,
}: AccountBalanceCardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  return (
    <div className={cardClassName}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1">
            <Wallet size={16} aria-hidden="true" />
            Saldo em conta
          </p>
          <h3 className="text-3xl font-bold text-foreground tracking-tight tabular-nums">
            {formatCurrency(availableBalance)}
          </h3>
        </div>
        <Button onClick={() => setIsTopUpOpen(true)} className="h-11">
          <Plus aria-hidden="true" />
          Adicionar saldo
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Disponível para investir, transferir e fazer câmbio.{" "}
        <span className="font-semibold text-foreground">
          Adicionar saldo é grátis: o dinheiro é simulado.
        </span>
      </p>

      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <DialogTitle>Adicionar saldo grátis</DialogTitle>
            <DialogDescription>
              É dinheiro simulado para praticar: não há pagamento, cartão nem
              cobrança.
            </DialogDescription>
          </div>
          <TopUpForm
            autoFocus
            onSuccess={() => {
              setIsTopUpOpen(false);
              onBalanceChange?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
