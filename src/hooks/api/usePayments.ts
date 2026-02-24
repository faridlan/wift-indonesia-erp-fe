import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPayment,
  deletePayment,
  getPaymentOrders,
  getPayments,
  updatePayment,
  type Order,
  type Payment,
  type PaymentPayload,
  type PaymentUpdatePayload,
} from "@/services/payments";

const PAYMENTS_QUERY_KEY = ["payments"];
const PAYMENT_ORDERS_QUERY_KEY = ["payment-orders"];

export function usePayments() {
  return useQuery<Payment[], Error>({
    queryKey: PAYMENTS_QUERY_KEY,
    queryFn: getPayments,
  });
}

export function usePaymentOrders() {
  return useQuery<Order[], Error>({
    queryKey: PAYMENT_ORDERS_QUERY_KEY,
    queryFn: getPaymentOrders,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, PaymentPayload>({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, PaymentUpdatePayload>({
    mutationFn: updatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_QUERY_KEY });
    },
  });
}
