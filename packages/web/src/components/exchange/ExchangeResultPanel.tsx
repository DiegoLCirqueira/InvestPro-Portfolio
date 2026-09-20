import type { FormEvent } from "react";
import { ExchangeResultCard } from "@/components/exchange/ExchangeResultCard";
import type { ExchangeSummary } from "@/types/exchange";

interface ExchangeResultPanelProps {
  simulation: ExchangeSummary | null;
  executed: ExchangeSummary | null;
  isExecuting: boolean;
  onExecute: (event: FormEvent) => void;
}

/** Coluna de resultado do câmbio: nada, simulação (com "Realizar conversão") ou confirmação. */
export function ExchangeResultPanel({
  simulation,
  executed,
  isExecuting,
  onExecute,
}: ExchangeResultPanelProps) {
  if (simulation) {
    return (
      <ExchangeResultCard variant="simulation" summary={simulation}>
        <form onSubmit={onExecute} className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={isExecuting}
            className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isExecuting ? "Realizando..." : "Realizar conversão"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            A cotação pode variar até a conversão ser realizada.
          </p>
        </form>
      </ExchangeResultCard>
    );
  }

  if (executed) {
    return <ExchangeResultCard variant="confirmation" summary={executed} />;
  }

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-4">
      <h3 className="text-base font-bold text-foreground">Resultado</h3>
      <p className="text-sm text-muted-foreground text-center py-16">
        Preencha o valor e clique em Converter para simular a conversão.
      </p>
    </div>
  );
}
