import { useCallback, useRef, useState, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { PiggyBank } from "lucide-react";
import { SavingsBoxDialog, type SavingsBoxMode } from "@/components/savings-box/SavingsBoxDialog";
import { Button } from "@/components/ui/button";
import { useSavingsBox } from "@/hooks/use-savings-box";
import { formatCurrency } from "@/lib/format";
import { SAVINGS_BOX_ANCHOR } from "@/lib/savings-box";

interface SavingsBoxRowProps {
  /** Saldo em conta: o diálogo mostra de onde sai (depósito) e para onde volta (resgate). */
  accountBalance: number;
  /** Depois de depositar ou resgatar, para o Painel recarregar o saldo em conta e o gráfico. */
  onBalanceChange?: () => void;
}

// Caixinha fixa no topo de "Seus Ativos", sempre presente (mesmo com R$ 0,00): uma linha no
// estilo dos ativos, sem o card próprio que ocupava espaço demais ao lado do Saldo em conta.
// As ações e o separador embaixo a distinguem de um ativo comprado.
export function SavingsBoxRow({ accountBalance, onBalanceChange }: SavingsBoxRowProps) {
  const { balance, refetch } = useSavingsBox();
  const [mode, setMode] = useState<SavingsBoxMode | null>(null);
  // Botão que abriu o diálogo, para o foco voltar a ele ao fechar.
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const open = (event: MouseEvent<HTMLButtonElement>, nextMode: SavingsBoxMode) => {
    openerRef.current = event.currentTarget;
    setMode(nextMode);
  };
  const { hash } = useLocation();

  // /#caixinha (Recomendações e o antigo /orders#caixinha): rola até aqui quando a linha aparece.
  // Fica na própria linha porque ela só existe depois que "Seus Ativos" carrega. useCallback:
  // um ref novo a cada render rolaria a tela de novo a cada atualização do saldo.
  const scrollIfLinked = useCallback(
    (node: HTMLElement | null) => {
      if (node && hash === `#${SAVINGS_BOX_ANCHOR}`) node.scrollIntoView({ block: "start" });
    },
    [hash],
  );

  return (
    <section
      ref={scrollIfLinked}
      id={SAVINGS_BOX_ANCHOR}
      aria-label="Caixinha"
      className="mb-4 shrink-0 scroll-mt-4 border-b border-border pb-4"
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/15 text-brand-primary">
            <PiggyBank size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold">Caixinha</p>
            <p className="text-xs text-muted-foreground">Rende 100% do CDI</p>
          </div>
        </div>
        <p className="font-bold tabular-nums">{formatCurrency(balance)}</p>
      </div>

      {/* Compactas no texto, mas com 44px de altura para o toque. */}
      <div className="grid grid-cols-2 gap-2 px-3">
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={(event) => open(event, "DEPOSIT")}
        >
          Depositar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={(event) => open(event, "WITHDRAW")}
        >
          Resgatar
        </Button>
      </div>

      <SavingsBoxDialog
        mode={mode}
        onClose={() => setMode(null)}
        returnFocusTo={openerRef}
        accountBalance={accountBalance}
        savingsBalance={balance}
        onSuccess={() => {
          void refetch();
          onBalanceChange?.();
        }}
      />
    </section>
  );
}
