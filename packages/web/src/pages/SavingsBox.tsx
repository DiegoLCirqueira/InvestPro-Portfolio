import { useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PiggyBank } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { ReservedBalanceNote } from "@/components/ReservedBalanceNote";
import { SectionTitle } from "@/components/SectionTitle";
import { SavingsBoxDialog, type SavingsBoxMode } from "@/components/savings-box/SavingsBoxDialog";
import { SavingsBoxSkeleton } from "@/components/skeletons/SavingsBoxSkeleton";
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { useSavingsBox } from "@/hooks/use-savings-box";
import { useFreeBalance } from "@/hooks/use-free-balance";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const TITLE = "Caixinha";
const DESCRIPTION = "Seu dinheiro guardado, rendendo 100% do CDI.";

// Só o que a API tem (saldo, taxa e rendimento estimado): sem extrato nem gráfico inventados.
const HOW_IT_WORKS = [
  "É dinheiro simulado, para praticar: nada é cobrado nem pago de verdade.",
  "Deposite do Saldo em conta e resgate quando quiser: o valor volta na hora para o Saldo em conta.",
  "Na Nova Ordem, uma compra a mercado pode usar a Caixinha para completar o que faltar no Saldo em conta.",
];

// A Caixinha ganhou página própria (antes era uma linha em "Seus Ativos", no Painel).
export function SavingsBox() {
  const savingsBox = useSavingsBox();
  // Só o saldo livre dá para depositar: o reservado em ordens abertas fica de fora.
  const portfolio = useFreeBalance();
  const [mode, setMode] = useState<SavingsBoxMode | null>(null);
  // Botão que abriu o diálogo, para o foco voltar a ele ao fechar.
  const openerRef = useRef<HTMLElement | null>(null);
  const open = (event: MouseEvent<HTMLButtonElement>, nextMode: SavingsBoxMode) => {
    openerRef.current = event.currentTarget;
    setMode(nextMode);
  };

  if (savingsBox.isLoading || portfolio.isLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-300">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <SavingsBoxSkeleton />
      </div>
    );
  }

  const error = savingsBox.error ?? portfolio.error;
  if (error) {
    return (
      <div className="flex flex-col">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ErrorState
          title="Não foi possível carregar a Caixinha"
          message={error.message}
          onRetry={() => {
            void savingsBox.refetch();
            void portfolio.refetch();
          }}
        />
      </div>
    );
  }

  const { balance, data } = savingsBox;
  const isEmpty = balance <= 0;

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader title={TITLE} description={DESCRIPTION} />

      {/* Como em Ordens: no desktop o principal à esquerda e a explicação à direita; no celular,
          empilhados nessa ordem. */}
      <div className="grid grid-cols-1 nav:grid-cols-5 gap-4 items-start">
        <section
          aria-labelledby="savings-box-balance"
          className={cn(cardClassName, "nav:col-span-3 flex flex-col gap-5")}
        >
          <div className="flex flex-col gap-1">
            <h2
              id="savings-box-balance"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <PiggyBank size={16} aria-hidden="true" />
              Guardado na Caixinha
            </h2>
            {!isEmpty && (
              <p className="text-3xl font-bold tracking-tight tabular-nums text-brand-primary">
                {formatCurrency(balance)}
              </p>
            )}
          </div>

          {isEmpty ? (
            // Vazia: convite ao primeiro depósito no lugar do valor zerado (e sem Resgatar).
            <EmptyState
              icon={PiggyBank}
              title="Sua Caixinha está vazia"
              message="Guarde parte do saldo em conta e ele passa a render 100% do CDI."
              action={{
                label: "Fazer o primeiro depósito",
                onClick: (event) => open(event, "DEPOSIT"),
              }}
              className="py-6"
            />
          ) : (
            <>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Rende</dt>
                  <dd className="font-semibold">
                    100% do CDI
                    {data && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        ({formatPercent(data.rate * 100, { decimals: 0 })} ao ano na simulação)
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">Rendimento estimado</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(data?.estimatedYield ?? 0)}
                  </dd>
                  {/* A API estima sobre o saldo de hoje, desde que a Caixinha foi aberta. */}
                  <dd className="text-xs text-muted-foreground">
                    Desde que você abriu a Caixinha, sobre o saldo atual.
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button onClick={(event) => open(event, "DEPOSIT")}>Depositar</Button>
                <Button variant="outline" onClick={(event) => open(event, "WITHDRAW")}>
                  Resgatar
                </Button>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Disponível para depositar:{" "}
              <strong className="font-semibold tabular-nums text-foreground">
                {formatCurrency(portfolio.free)}
              </strong>{" "}
              (Saldo em conta)
            </p>
            <ReservedBalanceNote reserved={portfolio.reserved} />
          </div>
        </section>

        <section
          aria-labelledby="savings-box-how"
          className={cn(cardClassName, "nav:col-span-2 flex flex-col gap-4")}
        >
          <SectionTitle id="savings-box-how">Como funciona</SectionTitle>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground marker:text-brand-primary">
            {HOW_IT_WORKS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link
            to="/orders"
            className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ir para Ordens
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <SavingsBoxDialog
        mode={mode}
        onClose={() => setMode(null)}
        returnFocusTo={openerRef}
        accountBalance={portfolio.free}
        reservedBalance={portfolio.reserved}
        savingsBalance={balance}
        onSuccess={() => {
          void savingsBox.refetch();
          void portfolio.refetch();
        }}
      />
    </div>
  );
}
