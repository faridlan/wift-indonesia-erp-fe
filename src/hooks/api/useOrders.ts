import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  deleteOrder,
  getOrderCustomers,
  getOrders,
  updateOrder,
  type Order,
  type Customer,
  type OrderPayload,
  type OrderUpdatePayload,
} from "@/services/orders";

const ORDERS_QUERY_KEY = ["orders"];
const ORDER_CUSTOMERS_QUERY_KEY = ["customers"];

export function useOrders() {
  return useQuery<Order[], Error>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrders,
  });
}

export function useOrderCustomers() {
  return useQuery<Customer[], Error>({
    queryKey: ORDER_CUSTOMERS_QUERY_KEY,
    queryFn: getOrderCustomers,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, OrderPayload>({
    mutationFn: createOrder,
    onSuccess: (newOrder) => {
      // Add the newly created order to the orders cache so the UI updates immediately
      queryClient.setQueryData<Order[] | undefined>(ORDERS_QUERY_KEY, (old) => {
        if (!old) return [newOrder];
        // Prepend to show newest first (matches existing UI behavior)
        return [newOrder, ...old];
      });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, OrderUpdatePayload>({
    mutationFn: updateOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    },
  });
}
