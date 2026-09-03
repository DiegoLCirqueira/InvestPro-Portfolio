import { SummaryCard } from "../components/SummaryCard";
import { EvolutionChart } from "../components/EvolutionChart";
import { Assets } from "../components/Assets";
import { usePortfolio, usePortfolioHistory } from "@/hooks/usePortfolio";
import { usePortfolioStore } from "@/stores/portfolio";
import { useAuthStore } from "@/stores/auth";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import type { PortfolioPeriod } from "@/types/portfolio";

function MobileGreeting() {
  const user = useAuthStore((s) => s.user);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="nav:hidden space-y-1 mb-6">
      <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
        {greeting},{" "}
        <span className="text-primary">
          {user?.fullName?.split(" ")[0] || "Investidor"}
        </span>
      </h2>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <p className="text-muted-foreground text-xs font-medium">
          Seu portfólio rendeu{" "}
          <span className="text-primary">+2.28%</span> nas últimas 24h.
        </p>
      </div>
    </div>
  );
}

const PERIOD_OPTIONS: { value: PortfolioPeriod; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1A" },
];

export function Dashboard() {
  const { period, setPeriod } = usePortfolioStore();
  const {
    balance,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = usePortfolio();
  const {
    history,
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

  const change =
    history.length >= 2
      ? ((history[history.length - 1].balance - history[0].balance) /
          history[0].balance) *
        100
      : 0;

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <MobileGreeting />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <MobileGreeting />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-border min-h-[60vh]">
          <h3 className="text-foreground font-semibold text-lg">
            Não foi possível carregar o portfólio
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {error.message}
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col nav:min-h-0">
      <MobileGreeting />

      <div className="grid grid-cols-1 nav:grid-cols-3 gap-8 items-stretch flex-1 nav:min-h-0">
        <div className="nav:col-span-2 space-y-6 flex flex-col nav:min-h-0">
          <SummaryCard balance={balance} change={change} />

          <div className="p-6 rounded-2xl border border-border nav:flex-1 flex flex-col nav:min-h-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Evolução do Patrimônio</h3>

              <div className="flex bg-secondary p-1 rounded-lg border border-border">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPeriod(option.value)}
                    className={`min-h-11 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                      period === option.value
                        ? "bg-brand-primary text-black"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="nav:flex-1 nav:min-h-0">
              <EvolutionChart data={history} />
            </div>
          </div>
        </div>

        <div className="nav:col-span-1 nav:h-full nav:min-h-0">
          <Assets />
        </div>
      </div>
    </div>
  );
}
