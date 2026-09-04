import { ShieldAlert, ShieldQuestion, Shield, LogIn } from "lucide-react";
import { RiskSkeleton } from "@/components/skeletons/RiskSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useRisk } from "@/hooks/use-risk";
import { ApiError } from "@/services/api";
import { formatDateTime } from "@/lib/format";
import type { RiskReport } from "@/types/risk";

interface MetricConfig {
  key: keyof RiskReport;
  label: string;
  format: (v: number) => string;
  good: "higher" | "lower";
  barValue: (v: number) => number;
}

const METRICS: MetricConfig[] = [
  {
    key: "var95",
    label: "VaR 95%",
    format: (v) => v.toFixed(2) + "%",
    good: "lower",
    barValue: (v) => Math.min(100, Math.max(0, v * 2)),
  },
  {
    key: "maxDrawdown",
    label: "Drawdown Máx.",
    format: (v) => v.toFixed(2) + "%",
    good: "lower",
    barValue: (v) => Math.min(100, Math.max(0, v * 2)),
  },
  {
    key: "sharpe",
    label: "Sharpe",
    format: (v) => v.toFixed(2),
    good: "higher",
    barValue: (v) => Math.min(100, Math.max(0, (v + 3) / 6 * 100)),
  },
  {
    key: "volatility",
    label: "Volatilidade",
    format: (v) => v.toFixed(2) + "%",
    good: "lower",
    barValue: (v) => Math.min(100, Math.max(0, v / 50 * 100)),
  },
];

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

export function RiskMetrics() {
  const { data, error, isLoading, refetch } = useRisk();

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const formattedMetrics = data?.metrics
    ? data.metrics.map((m) => {
        const config = METRICS.find(
          (c) => c.key === (m.metric as keyof RiskReport),
        );
        return config
          ? { ...m, format: config.format, good: config.good }
          : {
              ...m,
              format: (v: number) => String(v),
              good: null as "higher" | "lower" | null,
            };
      })
    : [];

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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
        <EmptyState icon={ShieldQuestion} message="Nenhum dado de risco disponível." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Shield size={22} className="text-brand-primary" />
          Análise de Risco
        </h2>
        <p className="text-muted-foreground text-sm">
          Indicadores de risco do seu portfólio.
        </p>
      </header>

      {data.score !== undefined && (
        <div className="p-6 rounded-2xl border border-border bg-surface-1 mb-6">
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
                  className={`text-xl font-black tabular-nums ${riskScoreColor(data.score)}`}
                >
                  {Math.round(data.score)}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Score de Risco</h3>
              <p className="text-xs text-muted-foreground">
                Escala de 0 a 100. Quanto maior o score, maior o risco estimado.
              </p>
            </div>
          </div>

          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${riskScoreBar(data.score)}`}
              style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {METRICS.map((metric) => {
          const value = data[metric.key];
          if (typeof value !== "number") return null;
          const isGood = metric.good === "higher" ? value >= 0 : value <= 0;
          const barColor = isGood ? "bg-brand-primary" : "bg-destructive";
          return (
            <div
              key={metric.key}
              className="p-5 rounded-2xl border border-border bg-surface-1"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </span>
                <span
                  className={`text-lg font-black tabular-nums ${
                    isGood ? "text-brand-primary" : "text-destructive"
                  }`}
                >
                  {metric.format(value)}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${metric.barValue(value)}%` }}
                />
              </div>
            </div>
          );
        })}

        {data.concentration !== undefined &&
          (() => {
            const isGood = data.concentration! <= 50;
            return (
              <div className="p-5 rounded-2xl border border-border bg-surface-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Concentração
                  </span>
                  <span
                    className={`text-lg font-black tabular-nums ${
                      isGood ? "text-brand-primary" : "text-destructive"
                    }`}
                  >
                    {data.concentration!.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isGood ? "bg-brand-primary" : "bg-destructive"}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, data.concentration!))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })()}
      </div>

      {data.updatedAt && (
        <p className="text-[10px] text-muted-foreground mt-4">
          Atualizado em {formatDateTime(data.updatedAt)}
        </p>
      )}

      {formattedMetrics.length > 0 && (
        <div className="mt-6 p-6 rounded-2xl border border-border bg-surface-1">
          <h3 className="text-base font-bold text-foreground mb-4">
            Métricas detalhadas
          </h3>
          <div className="space-y-3">
            {formattedMetrics.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {String(m.metric)}
                  </p>
                  {m.description && (
                    <p className="text-[10px] text-muted-foreground">{m.description}</p>
                  )}
                </div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {m.format(m.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
