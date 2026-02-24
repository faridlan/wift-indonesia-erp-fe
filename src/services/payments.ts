import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Payment = Tables<"payments">;
export type Order = Tables<"orders">;

export type PaymentPayload = {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
};

export type PaymentUpdatePayload = PaymentPayload & {
  id: string;
};

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPaymentOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createPayment(payload: PaymentPayload): Promise<void> {
  const { error } = await supabase.from("payments").insert({
    order_id: payload.orderId,
    amount: payload.amount,
    payment_method: payload.paymentMethod || null,
    notes: payload.notes || null,
  });

  if (error) {
    throw error;
  }
}

export async function updatePayment(payload: PaymentUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({
      order_id: payload.orderId,
      amount: payload.amount,
      payment_method: payload.paymentMethod || null,
      notes: payload.notes || null,
    })
    .eq("id", payload.id);

  if (error) {
    throw error;
  }
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

