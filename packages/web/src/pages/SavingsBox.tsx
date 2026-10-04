import { useRef, useState, type MouseEvent } from "react";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TopUpDialog } from "@/components/TopUpDialog";
import { SavingsBoxDialog, type SavingsBoxMode } from "@/components/savings-box/SavingsBoxDialog";
import { SavingsBoxHowItWorks } from "@/components/savings-box/SavingsBoxHowItWorks";
import { SavingsBoxSimulator } from "@/components/savings-box/SavingsBoxSimulator";
import { SavingsBoxSummary } from "@/components/savings-box/SavingsBoxSummary";
import { SavingsBoxSkeleton } from "@/components/skeletons/SavingsBoxSkeleton";
import { useSavingsBox } from "@/hooks/use-savings-box";
import { useFreeBalance } from "@/hooks/use-free-balance";

const TITLE = "Caixinha";
const DESCRIPTION = "Seu dinheiro guardado, rendendo 100% do CDI.";

// Responde às 3 perguntas de quem abre a Caixinha: quanto tenho guardado (Resumo), quanto rende
// ("Quanto rende") e como coloco ou tiro dinheiro (Depositar/Resgatar e "Como funciona").
export function SavingsBox() {
  const savingsBox = useSavingsBox();
  // Só o saldo livre dá para depositar: o reservado em ordens abertas fica de fora.
  const account = useFreeBalance();
  const [dialog, setDialog] = useState<{ mode: SavingsBoxMode; amount?: number } | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  // Botão que abriu o diálogo, para o foco voltar a ele ao fechar.
  const openerRef = useRef<HTMLElement | null>(null);
  // Primeiro depósito pelo estado vazio: o botão que abriu o diálogo some quando a Caixinha deixa
  // de estar vazia, e o foco se perdia. Marcado aqui, o foco vai para o Depositar que o substitui.
  const openedFromEmptyState = useRef(false);
  const focusDepositOnMount = useRef(false);
  const open = (
    event: MouseEvent<HTMLButtonElement>,
    mode: SavingsBoxMode,
    { amount, fromEmptyState = false }: { amount?: number; fromEmptyState?: boolean } = {},
  ) => {
    openerRef.current = event.currentTarget;
    openedFromEmptyState.current = fromEmptyState;
    setDialog({ mode, amount });
  };
  const depositRef = (node: HTMLButtonElement | null) => {
    if (!node || !focusDepositOnMount.current) return;
    focusDepositOnMount.current = false;
    // Também vira o alvo do foco de volta, caso o diálogo termine de fechar depois.
    openerRef.current = node;
    node.focus();
  };

  if (savingsBox.isLoading || account.isLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-300">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <SavingsBoxSkeleton />
      </div>
    );
  }

  const error = savingsBox.error ?? account.error;
  if (error) {
    return (
      <div className="flex flex-col">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ErrorState
          title="Não foi possível carregar a Caixinha"
          message={error.message}
          onRetry={() => {
            void savingsBox.refetch();
            void account.refetch();
          }}
        />
      </div>
    );
  }

  const { balance, data } = savingsBox;
  const rate = data?.rate ?? 0;
  const refetchBalances = () => {
    void savingsBox.refetch();
    void account.refetch();
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader title={TITLE} description={DESCRIPTION} />

      {/* Como em Ordens: grade de 5 colunas no desktop; no celular, empilhado na ordem A → B → C. */}
      <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
        <SavingsBoxSummary
          balance={balance}
          rate={rate}
          freeAccount={account.free}
          reserved={account.reserved}
          depositRef={depositRef}
          onDeposit={(event) => open(event, "DEPOSIT")}
          onWithdraw={(event) => open(event, "WITHDRAW")}
          onFirstDeposit={(event) => open(event, "DEPOSIT", { fromEmptyState: true })}
          onTopUp={() => setIsTopUpOpen(true)}
        />
        <SavingsBoxSimulator
          balance={balance}
          rate={rate}
          freeAccount={account.free}
          reserved={account.reserved}
          onDeposit={(event, amount) => open(event, "DEPOSIT", { amount })}
        />
        <SavingsBoxHowItWorks />
      </div>

      <SavingsBoxDialog
        mode={dialog?.mode ?? null}
        initialAmount={dialog?.amount}
        onClose={() => setDialog(null)}
        returnFocusTo={openerRef}
        accountBalance={account.free}
        reservedBalance={account.reserved}
        savingsBalance={balance}
        onSuccess={() => {
          if (openedFromEmptyState.current) focusDepositOnMount.current = true;
          refetchBalances();
        }}
      />
      {/* "Adicionar saldo grátis" do Painel: o primeiro passo quando não há saldo nem Caixinha. */}
      <TopUpDialog
        open={isTopUpOpen}
        onOpenChange={setIsTopUpOpen}
        onSuccess={() => void account.refetch()}
      />
    </div>
  );
}
