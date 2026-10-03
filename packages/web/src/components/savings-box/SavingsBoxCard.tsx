import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { MoneyCard } from "@/components/MoneyCard";
import { SavingsBoxDialog, type SavingsBoxMode } from "@/components/savings-box/SavingsBoxDialog";
import { Button } from "@/components/ui/button";
import { useSavingsBox } from "@/hooks/use-savings-box";
import { SAVINGS_BOX_ANCHOR } from "@/lib/savings-box";

interface SavingsBoxCardProps {
  /** Saldo em conta: o diálogo mostra de onde sai (depósito) e para onde volta (resgate). */
  accountBalance: number;
  /** Depois de depositar ou resgatar, para o Painel recarregar o saldo em conta e o gráfico. */
  onBalanceChange?: () => void;
}

// Caixinha ao lado do Saldo em conta: os dois "lugares do dinheiro" juntos. Antes ficava em
// Ordens, abaixo do formulário de compra, e se misturava com ele.
export function SavingsBoxCard({ accountBalance, onBalanceChange }: SavingsBoxCardProps) {
  const { balance, refetch } = useSavingsBox();
  const [mode, setMode] = useState<SavingsBoxMode | null>(null);

  return (
    <MoneyCard
      id={SAVINGS_BOX_ANCHOR}
      icon={PiggyBank}
      label="Caixinha"
      value={balance}
      valueClassName="text-brand-primary"
      description={
        <>
          Rende <strong className="text-brand-primary">100% do CDI</strong>. Deposite e resgate
          quando quiser.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setMode("DEPOSIT")}>
          Depositar
        </Button>
        <Button variant="outline" onClick={() => setMode("WITHDRAW")}>
          Resgatar
        </Button>
      </div>

      <SavingsBoxDialog
        mode={mode}
        onClose={() => setMode(null)}
        accountBalance={accountBalance}
        savingsBalance={balance}
        onSuccess={() => {
          void refetch();
          onBalanceChange?.();
        }}
      />
    </MoneyCard>
  );
}
