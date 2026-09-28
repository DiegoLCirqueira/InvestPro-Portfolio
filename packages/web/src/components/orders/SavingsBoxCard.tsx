import { useState } from "react";
import { SectionTitle } from "@/components/SectionTitle";
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
import { Button } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    // id="caixinha": destino do "Depositar na caixinha" das Recomendações (/orders#caixinha).
    <section id="caixinha" aria-labelledby="caixinha-title" className={cn(cardClassName, "scroll-mt-4 flex flex-col gap-5")}>
      <SectionTitle id="caixinha-title">Caixinha</SectionTitle>

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
        <Button
          type="submit"
          className="w-full"
          disabled={activeMutation.isPending}
        >
          {activeMutation.isPending
            ? "Enviando..."
            : SAVINGS_BOX_MODE_OPTIONS.find((o) => o.value === mode)?.label}
        </Button>
      </form>
    </section>
  );
}
