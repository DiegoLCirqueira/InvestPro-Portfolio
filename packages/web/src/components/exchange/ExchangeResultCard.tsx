import type { ReactNode } from "react";
import { formatCurrency, formatDateTime, formatExchangeRate } from "@/lib/format";
import type { ExecuteExchangeResponse } from "@/types/exchange";

function ResultRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const detailValueClassName = "text-foreground font-semibold tabular-nums";

export function ExchangeResultCard({
  result,
}: {
  result: ExecuteExchangeResponse | undefined;
}) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
      <h3 className="text-base font-bold text-foreground">Resultado</h3>

      {!result ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          Preencha o valor e clique em Converter para ver o resultado.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <ResultRow label="Você envia">
              <span className="text-foreground font-bold tabular-nums">
                {formatCurrency(result.amount, result.fromCurrency)}
              </span>
            </ResultRow>
            <ResultRow label="Você recebe">
              <span className="text-2xl font-bold text-brand-primary tabular-nums">
                {formatCurrency(result.convertedAmount, result.toCurrency)}
              </span>
            </ResultRow>
          </div>

          <div className="h-px bg-border" />

          <div className="flex flex-col gap-2">
            <ResultRow label={`Taxa (${result.fromCurrency} → ${result.toCurrency})`}>
              <span className={detailValueClassName}>{formatExchangeRate(result.rate)}</span>
            </ResultRow>
            <ResultRow label="Taxa de serviço">
              <span className={detailValueClassName}>
                {formatCurrency(result.fee, result.fromCurrency)}
              </span>
            </ResultRow>
            <ResultRow label="Data">
              <span className={detailValueClassName}>
                {formatDateTime(result.createdAt)}
              </span>
            </ResultRow>
          </div>
        </>
      )}
    </div>
  );
}
