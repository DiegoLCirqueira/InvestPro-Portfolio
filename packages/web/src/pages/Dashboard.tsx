import { EvolutionChart } from "../components/EvolutionChart";
import { Assets } from "../components/Assets";
import { usePortfolio, usePortfolioHistory } from "@/hooks/usePortfolio";
import { usePortfolioStore } from "@/stores/portfolio";
import { useAuthStore } from "@/stores/auth";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioKpis } from "@/components/PortfolioKpis";
import { SectionTitle } from "@/components/SectionTitle";
import { periodGain } from "@/lib/portfolio-return";
import type { PortfolioPeriod } from "@/types/portfolio";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// No Painel a saudação é o próprio título da página (antes ficava no cabeçalho só no desktop
// e num h2 à parte no celular).
function DashboardHeader() {
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
    />
  );
}

const PERIOD_OPTIONS: { value: PortfolioPeriod; label: string; name: string }[] = [
  { value: "7d", label: "7D", name: "7 dias" },
  { value: "30d", label: "30D", name: "30 dias" },
  { value: "90d", label: "90D", name: "90 dias" },
  { value: "1y", label: "1A", name: "12 meses" },
];

export function Dashboard() {
  const { period, setPeriod } = usePortfolioStore();
  const {
    balance,
    totalEquity,
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
  const periodName =
    PERIOD_OPTIONS.find((option) => option.value === period)?.name ?? "";

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
      <DashboardHeader />

      <PortfolioKpis
        totalEquity={totalEquity}
        availableBalance={balance}
        returnPct={returnPct}
        gain={returnPct === null ? null : periodGain(history)}
        periodLabel={periodName}
      />

      <div className="grid grid-cols-1 nav:grid-cols-3 gap-6 items-stretch flex-1 nav:min-h-0">
        <div className={cn(cardClassName, "nav:col-span-2 flex flex-col nav:min-h-0")}>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <SectionTitle>Evolução do Patrimônio</SectionTitle>

            <div
              role="group"
              aria-label="Período do gráfico"
              className="flex bg-secondary p-1 rounded-lg border border-border"
            >
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={period === option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`min-h-11 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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

        {/* A coluna de ativos não define a altura da linha (h-0 + min-h-full):
            ela vem do gráfico, e a lista de ativos rola dentro dela. */}
        <div className="nav:col-span-1 nav:h-0 nav:min-h-full">
          <Assets />
        </div>
      </div>
    </div>
  );
}
