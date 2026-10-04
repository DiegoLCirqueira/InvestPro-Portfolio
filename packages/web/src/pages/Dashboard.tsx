import { Navigate, useLocation } from "react-router-dom";
import { AccountBalanceCard } from "../components/AccountBalanceCard";
import { LEGACY_SAVINGS_BOX_HASH, SAVINGS_BOX_PATH } from "@/lib/savings-box";
import { EvolutionChart } from "../components/EvolutionChart";
import { Assets } from "../components/Assets";
import { usePortfolio, usePortfolioHistory } from "@/hooks/usePortfolio";
import { usePortfolioStore } from "@/stores/portfolio";
import { useAuthStore } from "@/stores/auth";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import type { PortfolioPeriod } from "@/types/portfolio";
import { formatPercent } from "@/lib/format";
import { cardClassName } from "@/components/ui/card";
import { changeToneClass } from "@/lib/change-tone";
import { cn } from "@/lib/utils";

// No Painel a saudação é o próprio título da página (antes ficava no cabeçalho só no desktop
// e num h2 à parte no celular).
export function DashboardHeader({ change }: { change?: number }) {
  const user = useAuthStore((s) => s.user);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <PageHeader
      title={
        <>
          {greeting},{" "}
          <span className="text-primary">
            {user?.fullName?.split(" ")[0] || "Investidor"}
          </span>
        </>
      }
      description={
        change !== undefined && (
          <>
            Seu portfólio {change >= 0 ? "rendeu" : "recuou"}{" "}
            {/* Queda em vermelho (era verde mesmo negativa), zero neutro, alta em verde. */}
            <span className={changeToneClass(change)}>
              {formatPercent(change, { showSign: true })}
            </span>{" "}
            no período.
          </>
        )
      }
    />
  );
}

const PERIOD_OPTIONS: { value: PortfolioPeriod; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1A" },
];

export function Dashboard() {
  const { hash } = useLocation();
  const { period, setPeriod } = usePortfolioStore();
  const {
    balance,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = usePortfolio();
  const {
    history,
    intraday,
    returnPct,
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistory,
  } = usePortfolioHistory({ period });

  const isLoading = isSummaryLoading || isHistoryLoading;
  const error = summaryError ?? historyError;
  const refetch = () => {
    void refetchSummary();
    void refetchHistory();
  };

  // Rentabilidade real do período (servidor), sem contar aportes/retiradas.
  const hasChangeData = returnPct !== null;
  const change = returnPct ?? 0;

  // A Caixinha já morou aqui (/#caixinha): quem salvou o link vai para a página dela.
  if (hash === LEGACY_SAVINGS_BOX_HASH) {
    return <Navigate to={SAVINGS_BOX_PATH} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <DashboardHeader />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <DashboardHeader />
        <ErrorState
          title="Não foi possível carregar o portfólio"
          message={error.message}
          onRetry={refetch}
          className="min-h-[60vh]"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <DashboardHeader change={hasChangeData ? change : undefined} />

      <div className="grid grid-cols-1 nav:grid-cols-3 gap-8 items-stretch flex-1 nav:min-h-0">
        <div className="nav:col-span-2 space-y-6 flex flex-col nav:min-h-0">
          <AccountBalanceCard
            availableBalance={balance}
            onBalanceChange={refetch}
          />

          <div
            className={cn(
              cardClassName,
              "nav:flex-1 flex flex-col nav:min-h-0",
            )}
          >
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <SectionTitle>Evolução do Patrimônio</SectionTitle>

              <div
                role="group"
                aria-label="Período do gráfico"
                className="flex bg-secondary p-1 rounded-xl border border-border"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={period === option.value}
                    onClick={() => setPeriod(option.value)}
                    className={`min-h-11 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      // Seletor, não ação: sem o verde cheio do botão principal (ver ui/segmented.ts).
                      period === option.value
                        ? "bg-primary/8 text-primary ring-1 ring-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="nav:flex-1 nav:min-h-0">
              <EvolutionChart data={history} intraday={intraday} />
            </div>
          </div>
        </div>

        {/* A coluna de ativos não define a altura da linha (h-0 + min-h-full):
            ela vem do saldo + gráfico, e a lista de ativos rola dentro dela,
            com o valor total fixo no rodapé. */}
        <div className="nav:col-span-1 nav:h-0 nav:min-h-full">
          <Assets change={hasChangeData ? change : undefined} />
        </div>
      </div>
    </div>
  );
}
