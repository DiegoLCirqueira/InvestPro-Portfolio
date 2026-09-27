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
import { CurrencyHoldingsCard } from "@/components/diversification/CurrencyHoldingsCard";
import { formatCurrency, formatPercent } from "@/lib/format";
import type {
  DiversificationCategory,
  PortfolioDiversificationItem,
} from "@/types/portfolio";
import { CATEGORY_COLORS } from "@/lib/allocation";

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
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-bold text-foreground text-sm">{item.label}</span>
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground text-xs">{item.label}</span>
        <span className="font-bold text-foreground tabular-nums">
          {formatCurrency(item.value)}
        </span>
      </div>
    </div>
  );
}

export function Diversification() {
  const { diversification, error, isLoading, refetch } = usePortfolio();

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-300">
        <PieSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500">
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Diversificação
          </h2>
        </header>
        <ErrorState
          title="Não foi possível carregar a diversificação"
          message={error.message}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Total investido (sem o caixa): base das barras dos cards.
  const totalBalance = diversification?.totalBalance ?? 0;
  const breakdown = diversification?.breakdown ?? [];
  const chartData = buildChartData(breakdown);

  const header = (
    <header className="mb-4">
      <h2 className="text-2xl font-bold text-foreground mb-1">
        Diversificação
      </h2>
      <p className="text-muted-foreground text-sm">
        Veja onde seu dinheiro está investido.
      </p>
    </header>
  );

  // Sem nenhuma categoria (as moedas do Câmbio também entram no breakdown), gráfico, cards e
  // Moedas ficariam todos vazios: um aviso único no lugar deles em vez de vários repetidos.
  if (breakdown.length === 0) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500">
        {header}
        <section className="rounded-2xl border border-border bg-surface-1">
          <EmptyState
            icon={PieChartIcon}
            title="Sua carteira ainda está vazia"
            message="A Diversificação mostra como seu dinheiro se divide entre ações, criptomoedas, renda fixa e moedas. Ela passa a funcionar assim que você fizer o seu primeiro investimento."
            action={{ label: "Ver ativos disponíveis", to: "/market" }}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      {header}

      <div className="grid grid-cols-1 nav:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-surface-1 flex flex-col min-h-0">
          <h3 className="text-base font-bold text-foreground mb-2">
            Distribuição do portfólio
          </h3>
          {/* Desktop: o card estica até a altura da coluna de categorias ao lado;
              o gráfico ocupa essa altura (flex-1) em vez de ficar fixo e deixar
              um vão vazio embaixo. Mobile mantém 256px. */}
          <div className="h-64 nav:h-auto nav:flex-1 nav:min-h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  // Proporcional ao espaço: a rosca cresce junto com o card.
                  innerRadius="50%"
                  outerRadius="78%"
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
                      {formatPercent(
                        Number(
                          (entry?.payload as Partial<ChartDatum> | undefined)
                            ?.percentage ?? 0,
                        ),
                        { decimals: 1 },
                      )}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {breakdown.map((item) => (
            <CategoryCard
              key={item.type}
              item={item}
              totalBalance={totalBalance}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <CurrencyHoldingsCard />
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
