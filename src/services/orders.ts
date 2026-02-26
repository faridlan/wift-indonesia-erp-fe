import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Order = Tables<"orders">;
export type Customer = Tables<"customers">;

export type OrderPayload = {
  customerId?: string;
  status: string;
  salesId: string;
};

export type OrderUpdatePayload = {
  id: string;
  customerId?: string;
  status: string;
};

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOrderCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
  const { data, error } = await supabase.from("orders").insert({
    customer_id: payload.customerId || null,
    status: payload.status,
    sales_id: payload.salesId,
  }).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOrder(payload: OrderUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      customer_id: payload.customerId || null,
      status: payload.status,
    })
    .eq("id", payload.id);

  if (error) {
    throw error;
  }
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

