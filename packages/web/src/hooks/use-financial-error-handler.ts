import { toast } from "sonner";
import { userMessageFor } from "@/lib/financial-error";
import { ApiError } from "@/services/api";
import { useInsufficientBalanceStore } from "@/stores/insufficient-balance";

// Id fixo: erros simultâneos viram um único toast em vez de empilhar.
const FINANCIAL_ERROR_TOAST_ID = "financial-error";

/**
 * Erro de operação financeira: saldo insuficiente abre o pop-up (e só ele);
 * qualquer outro erro vira UM toast com mensagem amigável.
 */
export function useFinancialErrorHandler(
  insufficientBalanceCodes: readonly string[] = [],
) {
  const openInsufficientBalance = useInsufficientBalanceStore((s) => s.open);

  return (error: Error) => {
    const isInsufficientBalance =
      error instanceof ApiError &&
      error.code !== undefined &&
      insufficientBalanceCodes.includes(error.code);

    if (isInsufficientBalance) {
      openInsufficientBalance(error.code);
      return;
    }
    toast.error(userMessageFor(error), { id: FINANCIAL_ERROR_TOAST_ID });
  };
}
