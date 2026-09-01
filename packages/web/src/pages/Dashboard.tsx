import { SummaryCard } from "../components/SummaryCard";
import { EvolutionChart } from "../components/EvolutionChart";
import { Assets } from "../components/Assets";
import { usePortfolio, usePortfolioHistory } from "@/hooks/usePortfolio";
import { usePortfolioStore } from "@/stores/portfolio";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import type { PortfolioPeriod } from "@/types/portfolio";

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
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-gray-800 min-h-[60vh]">
          <h3 className="text-white font-semibold text-lg">
            Não foi possível carregar o portfólio
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1 min-h-0">
      <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
        <SummaryCard balance={balance} change={change} />

        <div className="p-6 rounded-2xl border border-gray-800 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Evolução do Patrimônio</h3>

            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    period === option.value
                      ? "bg-brand-primary text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <EvolutionChart data={history} />
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 h-full min-h-0">
        <Assets />
      </div>
    </div>
  );
}
