import { useState } from "react";
import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import { toError } from "@/lib/errors";
import type {
  SavingsBoxResponse,
  SavingsBoxTransaction,
  SavingsBoxTransactionPage,
} from "@/types/savings-box";

export const SAVINGS_BOX_TRANSACTIONS_LIMIT = 10;

const fetchTransactions = (cursor?: string) =>
  api.get<SavingsBoxTransactionPage>("/savings-box/transactions", {
    limit: SAVINGS_BOX_TRANSACTIONS_LIMIT,
    cursor,
  });

/**
 * Extrato da Caixinha, 10 por vez: a primeira página vem da query e "Ver mais" acrescenta as
 * seguintes pelo cursor. As páginas extras valem só para a primeira página de onde saíram: depois
 * de um depósito (refetch), a lista recomeça do topo em vez de misturar dados velhos.
 */
export function useSavingsBoxTransactions() {
  const query = useQuery<SavingsBoxTransactionPage>({
    fetcher: () => fetchTransactions(),
    deps: [],
  });
  const [more, setMore] = useState<{
    base: SavingsBoxTransactionPage;
    items: SavingsBoxTransaction[];
    nextCursor: string | null;
  } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);

  const first = query.data;
  const extra = more && more.base === first ? more : null;
  const nextCursor = extra ? extra.nextCursor : (first?.nextCursor ?? null);

  const loadMore = async () => {
    if (!first || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchTransactions(nextCursor);
      setMore({
        base: first,
        items: [...(extra?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      });
    } catch (error) {
      setLoadMoreError(toError(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    items: [...(first?.items ?? []), ...(extra?.items ?? [])],
    hasMore: nextCursor !== null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    loadMore,
    isLoadingMore,
    loadMoreError,
  };
}

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

export type SavingsBoxTransactionsState = ReturnType<typeof useSavingsBoxTransactions>;

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
