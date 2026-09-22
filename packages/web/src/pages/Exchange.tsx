import { useState } from "react";
import { ArrowDownUp, LogIn } from "lucide-react";
import { ExchangeSkeleton } from "@/components/skeletons/ExchangeSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { FormField } from "@/components/FormField";
import { CurrencySelect } from "@/components/exchange/CurrencySelect";
import { ExchangeResultPanel } from "@/components/exchange/ExchangeResultPanel";
import { useExchange } from "@/hooks/useExchange";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useExchangeFlow } from "@/hooks/use-exchange-flow";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import { ApiError } from "@/services/api";

export function Exchange() {
  const { currencies, base, isLoading, error, refetch } = useExchange();

  const [from, setFrom] = useState(base);
  const [to, setTo] = useState(currencies[0] ?? "USD");
  const amountInput = useCurrencyDigitsInput();

  const flow = useExchangeFlow({
    input: { from, to, amount: amountInput.amount },
    onExecuted: amountInput.reset,
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
      <div className="flex-1 animate-in fade-in duration-300">
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
    <div className="flex-1 flex flex-col animate-in fade-in duration-500">
      <header className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-foreground mb-1">Câmbio de Moedas</h2>
        <p className="text-muted-foreground text-sm">
          Simule a conversão entre moedas e, se gostar do resultado, realize-a.
        </p>
      </header>

      <div className="grid grid-cols-1 nav:grid-cols-2 gap-4 items-start">
        <form
          onSubmit={handleSimulate}
          className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5"
        >
          <h3 className="text-base font-bold text-foreground">Conversor</h3>

          <FormField label="Valor">
            <CurrencyDigitsField input={amountInput} ariaLabel="Valor a converter" />
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

          <button
            type="submit"
            disabled={flow.isSimulating}
            className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer"
          >
            {flow.isSimulating ? "Simulando..." : "Converter"}
          </button>
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
