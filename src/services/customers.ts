import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;

export type CustomerPayload = {
  name: string;
  phone?: string;
  address?: string;
  salesId: string;
};

export type CustomerUpdatePayload = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
};

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createCustomer(payload: CustomerPayload): Promise<void> {
  const { error } = await supabase.from("customers").insert({
    name: payload.name,
    phone: payload.phone || null,
    address: payload.address || null,
    sales_id: payload.salesId,
  });

  if (error) {
    throw error;
  }
}

export async function updateCustomer(payload: CustomerUpdatePayload): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({
      name: payload.name,
      phone: payload.phone || null,
      address: payload.address || null,
    })
    .eq("id", payload.id);

  if (error) {
    throw error;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

