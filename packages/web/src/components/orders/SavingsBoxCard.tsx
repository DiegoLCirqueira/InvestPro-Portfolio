import { useState } from "react";
import { toast } from "sonner";
import { CurrencyDigitsField } from "@/components/CurrencyDigitsField";
import { segmentClassName } from "@/components/ui/segmented";
import { FormField } from "@/components/FormField";
import { useCurrencyDigitsInput } from "@/hooks/use-currency-digits-input";
import { useFinancialErrorHandler } from "@/hooks/use-financial-error-handler";
import { useSubmitOnce } from "@/hooks/use-submit-once";
import {
  useSavingsBox,
  useSavingsBoxDeposit,
  useSavingsBoxWithdraw,
} from "@/hooks/use-savings-box";
import { formatCurrency } from "@/lib/format";

type SavingsBoxMode = "DEPOSIT" | "WITHDRAW";

const SAVINGS_BOX_MODE_OPTIONS: { value: SavingsBoxMode; label: string }[] = [
  { value: "DEPOSIT", label: "Depositar" },
  { value: "WITHDRAW", label: "Resgatar" },
];

export function SavingsBoxCard() {
  const { balance, refetch } = useSavingsBox();
  const [mode, setMode] = useState<SavingsBoxMode>("DEPOSIT");
  const amountInput = useCurrencyDigitsInput();

  const handleMutationSuccess = (successMessage: string) => {
    toast.success(successMessage);
    amountInput.reset();
    void refetch();
  };

  // Depositar sai do saldo do portfólio; resgatar sai do saldo da caixinha.
  const handleDepositError = useFinancialErrorHandler([
    "PORTFOLIO_INSUFFICIENT_BALANCE",
  ]);
  const handleWithdrawError = useFinancialErrorHandler([
    "SAVINGS_BOX_INSUFFICIENT_BALANCE",
  ]);

  const deposit = useSavingsBoxDeposit({
    onSuccess: () => handleMutationSuccess("Depósito realizado com sucesso!"),
    onError: handleDepositError,
  });

  const withdraw = useSavingsBoxWithdraw({
    onSuccess: () => handleMutationSuccess("Resgate realizado com sucesso!"),
    onError: handleWithdrawError,
  });

  const activeMutation = mode === "DEPOSIT" ? deposit : withdraw;

  const submitSavingsBox = async () => {
    if (amountInput.amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    try {
      await activeMutation.mutate(amountInput.amount);
    } catch {
      // erro já tratado via onError
    }
  };

  const handleSubmit = useSubmitOnce(submitSavingsBox);

  return (
    <div className="p-6 rounded-2xl border border-border bg-surface-1 flex flex-col gap-5">
      <h3 className="text-base font-bold text-foreground">Caixinha</h3>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Saldo na caixinha</span>
        <span className="text-2xl font-bold text-brand-primary tabular-nums">
          {formatCurrency(balance)}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Rende{" "}
        <span className="text-brand-primary font-bold text-sm">
          100% do CDI
        </span>{" "}
        · deposite e resgate quando quiser.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {SAVINGS_BOX_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            onClick={() => setMode(option.value)}
            className={segmentClassName(mode === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <FormField label="Valor">
          <CurrencyDigitsField
            input={amountInput}
            ariaLabel="Valor a movimentar na caixinha"
          />
        </FormField>
        <button
          type="submit"
          disabled={activeMutation.isPending}
          className="min-h-11 w-full py-3 rounded-xl bg-primary-solid hover:opacity-90 disabled:opacity-50 transition-opacity duration-200 text-primary-foreground font-bold text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {activeMutation.isPending
            ? "Enviando..."
            : SAVINGS_BOX_MODE_OPTIONS.find((o) => o.value === mode)?.label}
        </button>
      </form>
    </div>
  );
}
