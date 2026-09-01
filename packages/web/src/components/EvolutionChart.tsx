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

export function EvolutionChart({ data }: EvolutionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="h-full w-full min-h-75">
      <ResponsiveContainer width="100%" height="100%" minHeight={0}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#1f2937"
          />
          <XAxis dataKey="date" hide />
          <YAxis
            width={60}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `R$${value}`}
          />

          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Patrimônio"]}
            contentStyle={{
              backgroundColor: "#161b22",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#10b981" }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#colorValue)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
