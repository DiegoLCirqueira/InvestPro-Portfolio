import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type { CreateTransferInput, Transfer, TransferList } from "@/types/transfer";

const TRANSFERS_LIMIT = 50;

export interface UseTransfersOptions {
  page?: number;
  limit?: number;
  initialData?: TransferList;
  enabled?: boolean;
}

export function useTransfers({
  page = 1,
  limit = TRANSFERS_LIMIT,
  initialData,
  enabled = true,
}: UseTransfersOptions = {}) {
  return useQuery<TransferList>({
    fetcher: () => api.get<TransferList>("/transfers", { page, limit }),
    deps: [page, limit],
    initialData,
    enabled,
  });
}

export interface UseCreateTransferOptions {
  onSuccess?: (transfer: Transfer) => void;
  onError?: (error: Error) => void;
}

export function useCreateTransfer(
  options: UseCreateTransferOptions = {},
): ReturnType<typeof useMutation<Transfer, CreateTransferInput>> {
  return useMutation<Transfer, CreateTransferInput>({
    action: (input) => api.post<Transfer>("/transfers", input),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export type {
  Transfer,
  TransferList,
  TransferStatus,
  TransferType,
  BankAccount,
} from "@/types/transfer";
