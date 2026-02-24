import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OrderItem = Tables<"order_items">;
export type Order = Tables<"orders">;

export type OrderItemPayload = {
  orderId?: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
};

export type OrderItemUpdatePayload = OrderItemPayload & {
  id: string;
};

export async function getOrderItems(): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOrderItemOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createOrderItem(payload: OrderItemPayload): Promise<void> {
  const { error } = await supabase.from("order_items").insert({
    order_id: payload.orderId || null,
    product_name: payload.productName,
    quantity: payload.quantity,
    price_per_unit: payload.pricePerUnit,
  });

  if (error) {
    throw error;
  }
}

export async function updateOrderItem(payload: OrderItemUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from("order_items")
    .update({
      order_id: payload.orderId || null,
      product_name: payload.productName,
      quantity: payload.quantity,
      price_per_unit: payload.pricePerUnit,
    })
    .eq("id", payload.id);

  if (error) {
    throw error;
  }
}

export async function deleteOrderItem(id: string): Promise<void> {
  const { error } = await supabase.from("order_items").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

