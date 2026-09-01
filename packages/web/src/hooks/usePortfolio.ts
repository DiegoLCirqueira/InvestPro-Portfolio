import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import type {
  PortfolioDiversificationResponse,
  PortfolioHistoryResponse,
  PortfolioPeriod,
  PortfolioPosition,
  PortfolioResponse,
} from "@/types/portfolio";

export interface UsePortfolioOptions {
  enabled?: boolean;
}

export function usePortfolioPositions(options: UsePortfolioOptions = {}) {
  const query = useQuery<PortfolioResponse>({
    fetcher: () => api.get<PortfolioResponse>("/portfolio"),
    deps: [],
    enabled: options.enabled,
  });

  return {
    data: query.data,
    balance: query.data?.balance ?? 0,
    positions: (query.data?.positions ?? []) as PortfolioPosition[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
  const summary = useQuery<PortfolioResponse>({
    fetcher: () => api.get<PortfolioResponse>("/portfolio"),
    deps: [],
    enabled: options.enabled,
  });

  const diversification = useQuery<PortfolioDiversificationResponse>({
    fetcher: () =>
      api.get<PortfolioDiversificationResponse>("/portfolio/diversification"),
    deps: [],
    enabled: options.enabled,
  });

  const isLoading = summary.isLoading || diversification.isLoading;
  const error = summary.error ?? diversification.error;
  const data = summary.data;

  return {
    data,
    balance: data?.balance ?? 0,
    positions: (data?.positions ?? []) as PortfolioPosition[],
    diversification: diversification.data ?? null,
    isLoading,
    isFetching: summary.isFetching || diversification.isFetching,
    error,
    refetch: async () => {
      await summary.refetch();
      await diversification.refetch();
    },
  };
}

export interface UsePortfolioHistoryOptions {
  period?: PortfolioPeriod;
  enabled?: boolean;
}

export function usePortfolioHistory({
  period = "30d",
  enabled = true,
}: UsePortfolioHistoryOptions = {}) {
  const query = useQuery<PortfolioHistoryResponse>({
    fetcher: () =>
      api.get<PortfolioHistoryResponse>("/portfolio/history", {
        period,
      }),
    deps: [period],
    enabled,
  });

  return {
    data: query.data,
    history: query.data?.history ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export type {
  PortfolioPeriod,
  PortfolioPosition,
  PortfolioResponse,
  PortfolioHistoryResponse,
  PortfolioDiversificationResponse,
} from "@/types/portfolio";
