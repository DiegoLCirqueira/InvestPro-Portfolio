import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatCurrency } from "@/lib/format";
import type {
  PortfolioAssetType,
  PortfolioDiversificationItem,
} from "@/types/portfolio";

const CATEGORY_COLORS: Record<PortfolioAssetType, string> = {
  CRYPTO: "var(--color-cat-crypto)",
  STOCK: "var(--color-cat-stocks)",
  FIXED_INCOME: "var(--color-cat-fixed)",
};

const FALLBACK_CATEGORY_COLOR = "var(--color-muted-foreground)";

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
    color: CATEGORY_COLORS[item.type] ?? FALLBACK_CATEGORY_COLOR,
  }));
}

function CategoryCard({
  item,
  totalBalance,
}: {
  item: PortfolioDiversificationItem;
  totalBalance: number;
}) {
  const color = CATEGORY_COLORS[item.type] ?? FALLBACK_CATEGORY_COLOR;
  const width = totalBalance > 0 ? (item.value / totalBalance) * 100 : 0;

  return (
    <div className="p-4 rounded-2xl border border-border bg-surface-1 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-bold text-foreground text-sm">{item.label}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {item.percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground text-xs">
          {item.type === "CRYPTO"
            ? "Criptomoedas"
            : item.type === "STOCK"
              ? "Ações"
              : item.type === "FIXED_INCOME"
                ? "Renda Fixa"
                : item.type}
        </span>
        <span className="font-bold text-foreground tabular-nums">
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
          <h2 className="text-2xl font-bold text-foreground mb-1">Diversificação</h2>
        </header>
        <ErrorState
          title="Não foi possível carregar a diversificação"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const totalBalance = diversification?.totalBalance ?? balance;
  const breakdown = diversification?.breakdown ?? [];
  const chartData = buildChartData(breakdown);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 overflow-hidden">
      <header className="mb-4 shrink-0">
        <h2 className="text-2xl font-bold text-foreground mb-1">Diversificação</h2>
        <p className="text-muted-foreground text-sm">
          Veja onde seu dinheiro está investido.
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 nav:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-surface-1 flex flex-col min-h-0">
            <h3 className="text-base font-bold text-foreground mb-2">
              Distribuição do portfólio
            </h3>
            <div className="h-64">
              {chartData.length === 0 ? (
                <EmptyState
                  icon={PieChartIcon}
                  message="Sem dados de diversificação."
                  className="py-20"
                />
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
                        backgroundColor: "var(--color-surface-1)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      formatter={(value, entry) => (
                        <span className="text-muted-foreground text-xs">
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
              <EmptyState icon={PieChartIcon} message="Sem dados de diversificação." />
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
    <div className="grid grid-cols-1 nav:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl border border-border bg-surface-1 h-80 animate-pulse">
        <div className="h-4 w-48 bg-secondary rounded mb-6" />
        <div className="w-56 h-56 rounded-full bg-secondary/50 mx-auto" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border bg-surface-1 h-24 animate-pulse"
          >
            <div className="h-3.5 w-32 bg-secondary rounded mb-3" />
            <div className="h-1.5 bg-secondary rounded-full mb-3" />
            <div className="h-3 w-24 bg-secondary/70 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
