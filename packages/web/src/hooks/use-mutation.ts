import { useCallback, useEffect, useRef, useState } from "react";
import { toError } from "@/lib/errors";

export interface UseMutationOptions<TData, TVariables> {
  action: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseMutationResult<TData, TVariables> {
  data: TData | undefined;
  error: Error | null;
  isPending: boolean;
  mutate: (variables: TVariables) => Promise<TData>;
}

export function useMutation<TData, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  const actionRef = useRef(options.action);
  const onSuccessRef = useRef(options.onSuccess);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    actionRef.current = options.action;
    onSuccessRef.current = options.onSuccess;
    onErrorRef.current = options.onError;
  });

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState<boolean>(false);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsPending(true);
      setError(null);

      try {
        const result = await actionRef.current(variables);
        setData(result);
        onSuccessRef.current?.(result);
        return result;
      } catch (err) {
        const normalized = toError(err);
        setError(normalized);
        onErrorRef.current?.(normalized);
        throw normalized;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { data, error, isPending, mutate };
}