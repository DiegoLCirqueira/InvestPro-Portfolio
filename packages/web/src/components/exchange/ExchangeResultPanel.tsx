import type { FormEvent } from "react";
import { SectionTitle } from "@/components/SectionTitle";
import { ExchangeResultCard } from "@/components/exchange/ExchangeResultCard";
import type { ExchangeSummary } from "@/types/exchange";
import { Button } from "@/components/ui/button";

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
      <ExchangeResultCard variant="simulation" summary={simulation} revealOnMobile>
        <form onSubmit={onExecute} className="flex flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={isExecuting}
          >
            {isExecuting ? "Realizando..." : "Realizar conversão"}
          </Button>
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

  // Vazio, o card só ocupava espaço abaixo da dobra no celular: aparece só no desktop.
  return (
    <div className="hidden nav:flex p-4 sm:p-6 rounded-2xl border border-border bg-surface-1 flex-col gap-4">
      <SectionTitle>Resultado</SectionTitle>
      <p className="text-sm text-muted-foreground text-center py-16">
        Preencha o valor e clique em Converter para simular a conversão.
      </p>
    </div>
  );
}
