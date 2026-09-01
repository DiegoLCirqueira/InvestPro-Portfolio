import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { usePortfolio } from "@/hooks/usePortfolio";
import type {
  PortfolioAssetType,
  PortfolioDiversificationItem,
} from "@/types/portfolio";

const CATEGORY_COLORS: Record<PortfolioAssetType, string> = {
  CRYPTO: "#f59e0b",
  STOCK: "#3b82f6",
  FIXED_INCOME: "#10b981",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

interface ChartDatum {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

function buildChartData(
  breakdown: PortfolioDiversificationItem[],
): ChartDatum[] {
  return breakdown.map((item) => ({
    name: item.label,
    value: item.value,
    percentage: item.percentage,
    color: CATEGORY_COLORS[item.type] ?? "#6b7280",
  }));
}

function CategoryCard({
  item,
  totalBalance,
}: {
  item: PortfolioDiversificationItem;
  totalBalance: number;
}) {
  const color = CATEGORY_COLORS[item.type] ?? "#6b7280";
  const width = totalBalance > 0 ? (item.value / totalBalance) * 100 : 0;

  return (
    <div className="p-4 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-bold text-white text-sm">{item.label}</span>
        </div>
        <span className="text-xs text-gray-400 tabular-nums">
          {item.percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 text-xs">
          {item.type === "CRYPTO"
            ? "Criptomoedas"
            : item.type === "STOCK"
              ? "Ações"
              : item.type === "FIXED_INCOME"
                ? "Renda Fixa"
                : item.type}
        </span>
        <span className="font-bold text-white tabular-nums">
          {formatCurrency(item.value)}
        </span>
      </div>
    </div>
  );
}

export function Diversification() {
  const {
    diversification,
    balance,
    error,
    isLoading,
    refetch,
  } = usePortfolio();

  if (isLoading) {
    return (
      <div className="flex-1 animate-in fade-in duration-300">
        <PieSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
        <header className="mb-4 shrink-0">
          <h2 className="text-2xl font-bold text-white mb-1">Diversificação</h2>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-gray-800">
          <h3 className="text-white font-semibold text-lg">
            Não foi possível carregar a diversificação
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md">
            {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-brand-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const totalBalance = diversification?.totalBalance ?? balance;
  const breakdown = diversification?.breakdown ?? [];
  const chartData = buildChartData(breakdown);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 overflow-hidden">
      <header className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold text-white mb-1">Diversificação</h2>
        <p className="text-gray-400 text-sm">
          Veja onde seu dinheiro está investido.
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-gray-800 bg-[#161b22] flex flex-col min-h-0">
            <h3 className="text-base font-bold text-white mb-2">
              Distribuição do portfólio
            </h3>
            <div className="h-64">
              {chartData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-20">
                  Sem dados de diversificação.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value)),
                        "Valor",
                      ]}
                      contentStyle={{
                        backgroundColor: "#161b22",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      formatter={(value, entry) => (
                        <span className="text-gray-300 text-xs">
                          {value} —{" "}
                          {String(
                            (entry?.payload as Record<string, unknown>)
                              ?.percentage ?? "",
                          )}
                          %
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {breakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-16">
                Sem dados de diversificação.
              </p>
            ) : (
              breakdown.map((item) => (
                <CategoryCard
                  key={item.type}
                  item={item}
                  totalBalance={totalBalance}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PieSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl border border-gray-800 bg-[#161b22] h-80 animate-pulse">
        <div className="h-4 w-48 bg-gray-800 rounded mb-6" />
        <div className="w-56 h-56 rounded-full bg-gray-800/50 mx-auto" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-gray-800 bg-[#161b22] h-24 animate-pulse"
          >
            <div className="h-3.5 w-32 bg-gray-800 rounded mb-3" />
            <div className="h-1.5 bg-gray-800 rounded-full mb-3" />
            <div className="h-3 w-24 bg-gray-800/70 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
