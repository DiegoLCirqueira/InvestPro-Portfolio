import { api } from "@/services/api";
import { useQuery } from "@/hooks/use-query";
import { useMutation } from "@/hooks/use-mutation";
import type { CreateOrderInput, Order, OrderList } from "@/types/order";

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

export type { Order, OrderList, OrderSide, OrderType, OrderStatus } from "@/types/order";
