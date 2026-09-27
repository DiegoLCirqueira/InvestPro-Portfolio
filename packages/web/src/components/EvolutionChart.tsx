import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { evolutionAxis } from "@/lib/chart-axis";
import type {
  PortfolioHistoryPoint,
  PortfolioIntradayPoint,
} from "@/types/portfolio";

interface EvolutionChartProps {
  data: PortfolioHistoryPoint[];
  /** Evolução dentro do dia: usada no 1º dia da conta, quando `data` tem 1 ponto. */
  intraday?: PortfolioIntradayPoint[];
}

interface ChartPoint {
  label: string;
  balance: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

const formatDay = (isoDay: string) =>
  new Date(`${isoDay}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

const formatTime = (isoInstant: string) =>
  new Date(isoInstant).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// Altura mínima menor no desktop (nav:min-h-40): lá o gráfico já ocupa o
// espaço livre (flex-1); em telas baixas ele encolhe para o Painel caber sem
// empurrar o valor total de "Seus Ativos" para fora da tela.
// Série real do patrimônio: um ponto por dia; no 1º dia da conta, a evolução
// dentro do dia (horários), pra linha existir desde o início. Sem animação:
// a linha não "redesenha" inteira quando o saldo muda.
export function EvolutionChart({ data, intraday = [] }: EvolutionChartProps) {
  const isDaily = data.length >= 2;
  const points: ChartPoint[] = isDaily
    ? data.map((point) => ({ label: point.date, balance: point.balance }))
    : intraday.map((point) => ({ label: point.at, balance: point.balance }));
  const formatLabel = isDaily ? formatDay : formatTime;
  const balances = points.map((point) => point.balance);
  const axis = evolutionAxis(Math.min(...balances), Math.max(...balances));

  if (points.length < 2) {
    return (
      <div className="h-full w-full min-h-75 nav:min-h-40 flex flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
        <p>O histórico do seu patrimônio começa hoje.</p>
        <p>A linha de evolução aparece com a próxima movimentação.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-75 nav:min-h-40">
      <ResponsiveContainer width="100%" height="100%" minHeight={0}>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-primary)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border)"
          />
          <XAxis dataKey="label" hide />
          <YAxis
            width={84}
            domain={axis.domain}
            ticks={axis.ticks}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={axis.format}
          />

          <Tooltip
            labelFormatter={(label) => formatLabel(String(label))}
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
