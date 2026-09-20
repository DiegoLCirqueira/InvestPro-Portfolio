import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type {
  ConvertRequest,
  ConvertResponse,
  CurrencyListResponse,
  ExecuteExchangeInput,
  ExecuteExchangeResponse,
} from "@/types/exchange";

export function useExchange() {
  const currencies = useQuery<CurrencyListResponse>({
    fetcher: () => api.get<CurrencyListResponse>("/exchange/currencies"),
    deps: [],
  });

  return {
    currencies: currencies.data?.items ?? [],
    base: currencies.data?.base ?? "BRL",
    isLoading: currencies.isLoading,
    isFetching: currencies.isFetching,
    error: currencies.error,
    refetch: currencies.refetch,
  };
}

export interface UseConvertExchangeOptions {
  onError?: (error: Error) => void;
}

/** Simula o câmbio (POST /exchange/convert): calcula taxa e valor, sem debitar nada. */
export function useConvertExchange(options: UseConvertExchangeOptions = {}) {
  return useMutation<ConvertResponse, ConvertRequest>({
    action: (input) => api.post<ConvertResponse>("/exchange/convert", input),
    onError: options.onError,
  });
}

export interface UseExecuteExchangeOptions {
  onSuccess?: (data: ExecuteExchangeResponse) => void;
  onError?: (error: Error) => void;
}

export function useExecuteExchange(options: UseExecuteExchangeOptions = {}) {
  return useMutation<ExecuteExchangeResponse, ExecuteExchangeInput>({
    action: (input) =>
      api.post<ExecuteExchangeResponse>("/exchange/execute", input),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export type {
  ConvertRequest,
  ConvertResponse,
  CurrencyListResponse,
  ExecuteExchangeInput,
  ExecuteExchangeResponse,
} from "@/types/exchange";
