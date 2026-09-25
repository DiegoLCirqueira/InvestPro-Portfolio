import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PortfolioHistoryPoint } from "@/types/portfolio";

interface EvolutionChartProps {
  data: PortfolioHistoryPoint[];
}

const formatDay = (isoDay: string) =>
  new Date(`${isoDay}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

// Série real do patrimônio (um ponto por dia, desde o primeiro registro da
// conta). Sem animação: a linha não "redesenha" inteira quando o saldo muda.
export function EvolutionChart({ data }: EvolutionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (data.length < 2) {
    return (
      <div className="h-full w-full min-h-75 flex flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {data.length === 1 ? formatCurrency(data[0].balance) : "—"}
        </p>
        <p>O histórico do seu patrimônio começa hoje.</p>
        <p>A linha de evolução aparece a partir do segundo dia.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-75">
      <ResponsiveContainer width="100%" height="100%" minHeight={0}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border)"
          />
          <XAxis dataKey="date" hide />
          <YAxis
            width={60}
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value: number) => `R$${value}`}
          />

          <Tooltip
            labelFormatter={(label) => formatDay(String(label))}
            formatter={(value) => [formatCurrency(Number(value)), "Patrimônio"]}
            contentStyle={{
              backgroundColor: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "var(--color-primary)" }}
          />
          <Area
            type="linear"
            dataKey="balance"
            stroke="var(--color-primary)"
            strokeWidth={3}
            fill="url(#colorValue)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
