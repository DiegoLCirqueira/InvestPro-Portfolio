import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type { CurrencyHolding, CurrencyHoldingList } from "@/types/exchange";

export function useCurrencyHoldings() {
  const query = useQuery<CurrencyHoldingList>({
    fetcher: () => api.get<CurrencyHoldingList>("/exchange/holdings"),
    deps: [],
  });

  return {
    holdings: (query.data?.items ?? []) as CurrencyHolding[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export type { CurrencyHolding } from "@/types/exchange";
