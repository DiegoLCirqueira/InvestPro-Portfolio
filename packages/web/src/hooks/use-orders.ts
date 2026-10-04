import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type {
  CreateOrderInput,
  Order,
  OrderReservations,
  OrderList,
  SellableAsset,
  SellableAssetList,
} from "@/types/order";

const ORDERS_LIMIT = 50;

export interface UseOrdersOptions {
  page?: number;
  limit?: number;
  initialData?: OrderList;
  enabled?: boolean;
}

export function useOrders({
  page = 1,
  limit = ORDERS_LIMIT,
  initialData,
  enabled = true,
}: UseOrdersOptions = {}) {
  return useQuery<OrderList>({
    fetcher: () =>
      api.get<OrderList>("/orders", { page, limit }),
    deps: [page, limit],
    initialData,
    enabled,
  });
}

export function useSellableAssets() {
  const query = useQuery<SellableAssetList>({
    fetcher: () => api.get<SellableAssetList>("/orders/sellable-assets"),
    deps: [],
  });

  return {
    sellableAssets: (query.data?.items ?? []) as SellableAsset[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UseCreateOrderOptions {
  onSuccess?: (order: Order) => void;
  onError?: (error: Error) => void;
}

export function useCreateOrder(
  options: UseCreateOrderOptions = {},
): ReturnType<typeof useMutation<Order, CreateOrderInput>> {
  return useMutation<Order, CreateOrderInput>({
    action: (input) => api.post<Order>("/orders", input),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

/** POST /orders/:id/cancel: só OPEN/PENDING; a reserva da ordem é liberada na hora. */
export function useCancelOrder(options: UseCreateOrderOptions = {}) {
  return useMutation<Order, string>({
    action: (orderId) => api.post<Order>(`/orders/${orderId}/cancel`),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}

export type { Order, OrderList, OrderSide, OrderType, OrderStatus } from "@/types/order";

/** Saldo e posição reservados pelas ordens abertas do usuário (o servidor faz a conta). */
export function useOrderReservations() {
  const query = useQuery<OrderReservations>({
    fetcher: () => api.get<OrderReservations>("/orders/reservations"),
    deps: [],
  });

  return {
    data: query.data,
    balance: query.data?.balance ?? 0,
    positions: query.data?.positions ?? {},
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
