import { toast } from "sonner";
import { fieldInputClassName } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import {
  usePortfolioPositions,
  useTopUpLimit,
  useTopUpPortfolio,
} from "@/hooks/usePortfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TopUpFormProps {
  /** Chamado depois de um depósito aceito (ex.: fechar o diálogo e recarregar o Painel). */
  onSuccess?: () => void;
  autoFocus?: boolean;
  /** No Perfil o botão é secundário (a página tem uma ação principal); no diálogo, é a ação. */
  submitVariant?: "default" | "outline";
}

// Formulário de "Adicionar saldo" (depósito simulado). Fica no Perfil e no diálogo do Painel:
// um só lugar com a regra do teto de depósitos e as mensagens.
export function TopUpForm({
  onSuccess,
  autoFocus = false,
  submitVariant = "default",
}: TopUpFormProps) {
  const { balance, isLoading, refetch } = usePortfolioPositions();
  const topUpLimit = useTopUpLimit();
  const amountInput = useCurrencyDigitsInput();
  const remaining = topUpLimit.data?.remaining;
  const isLimitReached = remaining === 0;

  const handleTopUpError = useFinancialErrorHandler();
  const topUp = useTopUpPortfolio({
    onSuccess: () => {
      toast.success("Saldo adicionado com sucesso!");
      amountInput.reset();
      void refetch();
      void topUpLimit.refetch();
      onSuccess?.();
    },
    onError: handleTopUpError,
  });

  const submitTopUp = async () => {
    if (amountInput.amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (remaining !== undefined && amountInput.amount > remaining) {
      toast.error(
        `Você ainda pode adicionar até ${formatCurrency(remaining)}.`,
      );
      return;
    }
    try {
      await topUp.mutate(amountInput.amount);
    } catch {
      // erro já tratado via onError
    }
  };

  const handleSubmit = useSubmitOnce(submitTopUp);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Saldo atual:{" "}
        <span className="font-semibold text-foreground">
          {isLoading ? "..." : formatCurrency(balance)}
        </span>
      </p>

      {topUpLimit.data && (
        <p className="text-xs text-muted-foreground">
          {isLimitReached ? (
            "Você já adicionou o limite de saldo da conta. Agora o saldo só cresce com seus investimentos."
          ) : (
            <>
              Ainda pode adicionar{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(topUpLimit.data.remaining)}
              </span>{" "}
              de {formatCurrency(topUpLimit.data.limit)} no total.
            </>
          )}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={amountInput.displayValue}
          onChange={amountInput.onChange}
          onPaste={amountInput.onPaste}
          aria-label="Valor a adicionar"
          autoFocus={autoFocus}
          disabled={isLimitReached}
          className={cn(fieldInputClassName, "min-w-0 flex-1 tabular-nums")}
        />
        <Button
          type="submit"
          variant={submitVariant}
          className="shrink-0"
          disabled={topUp.isPending || isLimitReached}
        >
          {topUp.isPending ? "Adicionando..." : "Adicionar saldo"}
        </Button>
      </form>
    </div>
  );
}
