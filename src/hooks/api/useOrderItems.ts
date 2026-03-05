import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createOrderItem,
  deleteOrderItem,
  getOrderItemOrders,
  getOrderItems,
  updateOrderItem,
  type Order,
  type OrderItem,
  type OrderItemPayload,
  type OrderItemUpdatePayload,
} from "@/services/order-items";

const ORDER_ITEMS_QUERY_KEY = ["order-items"];
const ORDER_ITEM_ORDERS_QUERY_KEY = ["order-item-orders"];

export function useOrderItems() {
  return useQuery<OrderItem[], Error>({
    queryKey: ORDER_ITEMS_QUERY_KEY,
    queryFn: getOrderItems,
  });
}

export function useOrderItemOrders() {
  return useQuery<Order[], Error>({
    queryKey: ORDER_ITEM_ORDERS_QUERY_KEY,
    queryFn: getOrderItemOrders,
  });
}

export function useCreateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, OrderItemPayload>({
    mutationFn: createOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_ITEMS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, OrderItemUpdatePayload>({
    mutationFn: updateOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_ITEMS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeleteOrderItem() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteOrderItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_ITEMS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
