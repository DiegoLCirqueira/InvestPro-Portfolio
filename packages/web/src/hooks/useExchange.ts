import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";

export interface CurrencyListResponse {
  base: string;
  items: string[];
}

export interface ConvertRequest {
  from: string;
  to: string;
  amount: number;
}

export interface ConvertResponse {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  fee: number;
  timestamp: string;
}

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

export interface UseConvertOptions {
  onSuccess?: (data: ConvertResponse) => void;
  onError?: (error: Error) => void;
}

export function useConvert(options: UseConvertOptions = {}) {
  return useMutation<ConvertResponse, ConvertRequest>({
    action: (input) =>
      api.post<ConvertResponse>("/exchange/convert", {
        from: input.from,
        to: input.to,
        amount: input.amount,
      }),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
