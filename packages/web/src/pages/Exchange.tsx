import { useState } from "react";
import { ArrowDownUp, LogIn } from "lucide-react";
import { ExchangeSkeleton } from "@/components/skeletons/ExchangeSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { SectionTitle } from "@/components/SectionTitle";
import { CurrencySelect } from "@/components/exchange/CurrencySelect";
import { ExchangeResultPanel } from "@/components/exchange/ExchangeResultPanel";
import { useExchange } from "@/hooks/useExchange";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useExchangeFlow } from "@/hooks/use-exchange-flow";
import { useAvailableBalance } from "@/hooks/use-available-balance";
import { formatCurrency } from "@/lib/format";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { ApiError } from "@/services/api";
import { Button } from "@/components/ui/button";

export function Exchange() {
  const { currencies, base, isLoading, error, refetch } = useExchange();

  const [from, setFrom] = useState(base);
  const [to, setTo] = useState(currencies[0] ?? "USD");
  const amountInput = useCurrencyDigitsInput({ currency: from });
  const originBalance = useAvailableBalance(from);

  const flow = useExchangeFlow({
    input: { from, to, amount: amountInput.amount },
    onExecuted: () => {
      amountInput.reset();
      void originBalance.refetch();
    },
  });
  const handleSimulate = useSubmitOnce(flow.simulate);
  const handleExecute = useSubmitOnce(flow.executeQuote);

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-300">
        <ExchangeSkeleton />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh]">
        <EmptyState
          icon={LogIn}
          title="Câmbio indisponível"
          message="É necessário estar autenticado para realizar conversões de câmbio."
          action={{ label: "Fazer login", to: "/login" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Não foi possível carregar as moedas"
        message={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <PageHeader
        title="Câmbio"
        description="Simule a conversão entre moedas e, se gostar do resultado, realize-a."
      />

      <div className="grid grid-cols-1 nav:grid-cols-2 gap-4 items-start">
        <form
          onSubmit={handleSimulate}
          className="p-4 sm:p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5"
        >
          <SectionTitle>Conversor</SectionTitle>

          <FormField label="Valor">
            <CurrencyDigitsField input={amountInput} ariaLabel="Valor a converter" />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Disponível em {from}:{" "}
              <span className="font-bold text-foreground tabular-nums">
                {originBalance.isLoading ? "…" : formatCurrency(originBalance.available, from)}
              </span>
            </p>
          </FormField>

          <div className="relative flex flex-col gap-16">
            <CurrencySelect
              id="exchange-from"
              label="De"
              value={from}
              currencies={currencies}
              onChange={setFrom}
            />
            <CurrencySelect
              id="exchange-to"
              label="Para"
              value={to}
              currencies={currencies}
              onChange={setTo}
            />

            <button
              type="button"
              onClick={handleSwap}
              aria-label="Inverter moedas"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-surface-1 border border-input text-muted-foreground hover:text-foreground hover:border-brand-primary transition-colors cursor-pointer"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={flow.isSimulating}
          >
            {flow.isSimulating ? "Simulando..." : "Converter"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Converter apenas simula: nada é debitado até você realizar a conversão.
          </p>
        </form>

        <ExchangeResultPanel
          simulation={flow.simulation}
          executed={flow.executed}
          isExecuting={flow.isExecuting}
          onExecute={handleExecute}
        />
      </div>
    </div>
  );
}
