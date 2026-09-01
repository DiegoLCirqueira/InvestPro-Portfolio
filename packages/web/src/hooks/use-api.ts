import { useQuery } from "@/hooks/use-query";

export interface UseApiOptions<T> {
  fetcher: () => Promise<T>;
  initialData?: T;
  enabled?: boolean;
}

export interface UseApiResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useApi<T>({
  fetcher,
  initialData,
  enabled = true,
}: UseApiOptions<T>): UseApiResult<T> {
  const { data, error, isLoading, refetch } = useQuery<T>({
    fetcher: () => fetcher(),
    initialData,
    enabled,
  });

  return { data, error, isLoading, refetch };
}