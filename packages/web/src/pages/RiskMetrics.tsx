import { ShieldAlert, ShieldQuestion, LogIn, Hourglass } from "lucide-react";
import { RiskSkeleton } from "@/components/skeletons/RiskSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { useRisk } from "@/hooks/use-risk";
import { ApiError } from "@/services/api";
import { formatDateTime, formatDecimal, formatPercent } from "@/lib/format";
import type { RiskReport } from "@/types/risk";

// Mesma regra do servidor (risk.service.ts, MIN_DAILY_RETURNS_FOR_RISK; o web não importa o
// server): VaR, volatilidade, drawdown e Sharpe só significam algo com ~20 dias de retornos.
const MIN_HISTORY_DAYS = 20;

// A API manda VaR, drawdown, volatilidade, concentração e maior posição como proporção
// (0,02 = 2%). Formatar direto como "%" mostrava o risco 100 vezes menor.
const toPct = (proportion: number) => proportion * 100;
const asPercent = (proportion: number) => formatPercent(toPct(proportion), { decimals: 1 });
const clampBar = (value: number) => Math.min(100, Math.max(0, value));

interface MetricView {
  label: string;
  description: string;
  value: number;
  format: (v: number) => string;
  isGood: (v: number) => boolean;
  barValue: (v: number) => number;
  /** Métrica de série: sem histórico suficiente o valor é um 0 sem significado. */
  series: boolean;
}

// Um card por métrica, com a descrição logo abaixo do nome: antes os mesmos números apareciam
// em cards e de novo numa lista "Métricas detalhadas", ali como "0,5002 (proporção)".
function metricsFor(data: RiskReport): MetricView[] {
  const largest = data.metrics?.find((m) => m.metric === "Maior posição")?.value;
  const metrics: (MetricView | null)[] = [
    {
      label: "VaR 95%",
      description: "Perda diária que só é superada em 5% dos dias.",
      value: data.var95,
      format: asPercent,
      isGood: (v) => v <= 0,
      barValue: (v) => clampBar(toPct(v) * 2),
      series: true,
    },
    {
      label: "Drawdown máximo",
      description: "Maior queda, do pico ao vale, no período observado.",
      value: data.maxDrawdown,
      format: asPercent,
      isGood: (v) => v <= 0,
      barValue: (v) => clampBar(toPct(v) * 2),
      series: true,
    },
    {
      label: "Volatilidade anual",
      description: "Quanto os retornos diários oscilam, em ritmo anual.",
      value: data.volatility,
      format: asPercent,
      isGood: (v) => v <= 0,
      barValue: (v) => clampBar((toPct(v) / 50) * 100),
      series: true,
    },
    {
      label: "Sharpe",
      description: "Retorno em excesso por unidade de risco, anualizado.",
      value: data.sharpe,
      format: (v) => formatDecimal(v),
      isGood: (v) => v >= 0,
      barValue: (v) => clampBar(((v + 3) / 6) * 100),
      series: true,
    },
    data.concentration === undefined
      ? null
      : {
          label: "Concentração",
          description: "Quanto a carteira depende de poucos ativos (índice HHI).",
          value: data.concentration,
          format: asPercent,
          isGood: (v) => toPct(v) <= 50,
          barValue: (v) => clampBar(toPct(v)),
          series: false,
        },
    largest === undefined
      ? null
      : {
          label: "Maior posição",
          description: "Peso do maior ativo no total investido.",
          value: largest,
          format: asPercent,
          isGood: (v) => toPct(v) <= 50,
          barValue: (v) => clampBar(toPct(v)),
          series: false,
        },
  ];
  return metrics.filter((m): m is MetricView => m !== null);
}

function riskScoreColor(score: number): string {
  if (score >= 70) return "text-brand-primary";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function riskScoreBar(score: number): string {
  if (score >= 70) return "bg-brand-primary";
  if (score >= 40) return "bg-warning";
  return "bg-destructive";
}

// No lugar de 4 cards com "—" e barras vazias: um bloco só, com quanto falta de histórico.
function HistoryProgress({ days, hasConcentration }: { days: number; hasConcentration: boolean }) {
  const remaining = Math.max(0, MIN_HISTORY_DAYS - days);
  return (
    <section
      aria-labelledby="risk-history-title"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface-1 p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Hourglass size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-1">
          <SectionTitle id="risk-history-title">
            VaR, volatilidade, drawdown e Sharpe: disponíveis em cerca de {remaining}{" "}
            {remaining === 1 ? "dia" : "dias"}
          </SectionTitle>
          <p className="text-sm text-muted-foreground">
            Essas métricas e a nota de risco precisam de {MIN_HISTORY_DAYS} dias de histórico do
            seu patrimônio.
            {hasConcentration && " A concentração da carteira já está disponível abaixo."}
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Histórico acumulado"
        aria-valuemin={0}
        aria-valuemax={MIN_HISTORY_DAYS}
        aria-valuenow={Math.min(days, MIN_HISTORY_DAYS)}
        aria-valuetext={`${days} de ${MIN_HISTORY_DAYS} dias`}
        className="h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-warning"
          style={{ width: `${clampBar((days / MIN_HISTORY_DAYS) * 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {days} de {MIN_HISTORY_DAYS} dias
      </p>
    </section>
  );
}

function MetricCard({ metric }: { metric: MetricView }) {
  const good = metric.isGood(metric.value);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-1 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{metric.label}</p>
        <span
          className={`text-lg font-bold tabular-nums ${good ? "text-brand-primary" : "text-destructive"}`}
        >
          {metric.format(metric.value)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{metric.description}</p>
      <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${good ? "bg-brand-primary" : "bg-destructive"}`}
          style={{ width: `${metric.barValue(metric.value)}%` }}
        />
      </div>
    </div>
  );
}

export function RiskMetrics() {
  const { data, error, isLoading, refetch } = useRisk();

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  if (isLoading) {
    return <RiskSkeleton />;
  }

  if (isUnauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
        <EmptyState
          icon={LogIn}
          title="Análise de Risco indisponível"
          message="É necessário estar autenticado para visualizar a análise de risco do seu portfólio."
          action={{ label: "Fazer login", to: "/login" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        icon={ShieldAlert}
        title="Não foi possível carregar a análise de risco"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col min-h-[40vh]">
        <PageHeader title="Risco" />
        <EmptyState
          icon={ShieldQuestion}
          message="Você ainda não possui investimentos suficientes para calcularmos métricas de risco. Comece investindo na aba Análise de Mercado."
          action={{ label: "Ver ativos disponíveis", to: "/market" }}
        />
      </div>
    );
  }

  const pending = data.insufficientHistory === true;
  // A Concentração, que já tem valor, continua aparecendo enquanto as de série esperam.
  const metrics = metricsFor(data).filter((metric) => !(pending && metric.series));

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="Risco"
        description="Indicadores de risco do seu portfólio."
      />

      {pending && (
        <HistoryProgress days={data.historyDays ?? 0} hasConcentration={metrics.length > 0} />
      )}

      {data.score !== undefined && (
        <div className="p-4 sm:p-6 rounded-2xl border border-border bg-surface-1 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${data.score} 100`}
                  className={riskScoreBar(data.score)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-xl font-bold tabular-nums ${riskScoreColor(data.score)}`}
                >
                  {Math.round(data.score)}
                </span>
              </div>
            </div>
            <div>
              <SectionTitle>Score de Risco</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Escala de 0 a 100. Quanto maior o score, maior o risco estimado.
              </p>
            </div>
          </div>

          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${riskScoreBar(data.score)}`}
              style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
            />
          </div>
        </div>
      )}

      {/* 3 colunas no desktop: com 6 métricas são 2 linhas cheias, sem card sozinho numa linha. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 nav:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {data.updatedAt && (
        <p className="text-xs text-muted-foreground mt-4">
          Atualizado em {formatDateTime(data.updatedAt)}
        </p>
      )}
    </div>
  );
}
