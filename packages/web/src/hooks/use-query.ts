import { useCallback, useEffect, useRef, useState } from "react";
import { toError } from "@/lib/errors";

export interface UseQueryOptions<T> {
  fetcher: (signal: AbortSignal) => Promise<T>;
  deps?: readonly unknown[];
  initialData?: T;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

function depsToKey(dep: unknown): string {
  if (dep === null || dep === undefined) return "null";
  if (typeof dep === "string") return `s:${dep}`;
  if (typeof dep === "number") return `n:${dep}`;
  if (typeof dep === "boolean") return `b:${dep}`;
  try {
    return `j:${JSON.stringify(dep)}`;
  } catch {
    return `x:${String(dep)}`;
  }
}

export function useQuery<T>({
  fetcher,
  deps = [],
  initialData,
  enabled = true,
  debounceMs = 0,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const fetcherRef = useRef(fetcher);
  const abortRef = useRef<AbortController | null>(null);

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(
    enabled && initialData === undefined,
  );

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetching(true);
    setError(null);

    try {
      const result = await fetcherRef.current(controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(toError(err));
    } finally {
      if (!controller.signal.aborted) {
        setIsFetching(false);
      }
    }
  }, []);

  const refetch = useCallback(() => run(), [run]);

  const signature = deps.map((dep) => depsToKey(dep)).join("|");

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      void run();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [enabled, debounceMs, run, signature]);

  const isLoading = isFetching && data === undefined;

  return { data, error, isLoading, isFetching, refetch };
}