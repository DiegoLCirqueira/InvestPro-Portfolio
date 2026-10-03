import { useState } from "react";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type { SavingsBoxResponse } from "@/types/savings-box";

export function useSavingsBox() {
  const query = useQuery<SavingsBoxResponse>({
    fetcher: () => api.get<SavingsBoxResponse>("/savings-box"),
    deps: [],
  });

  return {
    data: query.data,
    balance: query.data?.balance ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UseSavingsBoxMutationOptions {
  onSuccess?: (result: SavingsBoxResponse) => void;
  onError?: (error: Error) => void;
}

export function useSavingsBoxDeposit(
  options: UseSavingsBoxMutationOptions = {},
): ReturnType<typeof useMutation<SavingsBoxResponse, number>> {
  return useMutation<SavingsBoxResponse, number>({
    action: (amount) => api.post<SavingsBoxResponse>("/savings-box/deposit", { amount }),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export function useSavingsBoxWithdraw(
  options: UseSavingsBoxMutationOptions = {},
): ReturnType<typeof useMutation<SavingsBoxResponse, number>> {
  return useMutation<SavingsBoxResponse, number>({
    action: (amount) => api.post<SavingsBoxResponse>("/savings-box/withdraw", { amount }),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export type { SavingsBoxResponse } from "@/types/savings-box";

const USE_IN_ORDERS_KEY = "investpro-orders-use-savings-box";

/**
 * "Usar saldo da Caixinha se faltar" na Nova Ordem: começa marcado e a escolha vale para as
 * próximas ordens. Sem armazenamento (aba anônima, bloqueado), vale só enquanto a tela está aberta.
 */
export function useSavingsBoxInOrdersPreference() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(USE_IN_ORDERS_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const change = (value: boolean) => {
    setEnabled(value);
    try {
      localStorage.setItem(USE_IN_ORDERS_KEY, String(value));
    } catch {
      // sem armazenamento: a escolha vale só nesta tela
    }
  };

  return [enabled, change] as const;
}
