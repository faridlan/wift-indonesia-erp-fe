import { supabase } from "@/integrations/supabase/client";

export type POPeriod = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string | null;
};

export type POPeriodPayload = {
  name: string;
  start_date: string;
  end_date: string;
};

export type POPeriodUpdatePayload = {
  id: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
};

export async function getPOPeriods(): Promise<POPeriod[]> {
  const { data, error } = await supabase
    .from("po_periods" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as POPeriod[];
}

export async function getActivePOPeriod(): Promise<POPeriod | null> {
  const { data, error } = await supabase
    .from("po_periods" as any)
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const results = (data ?? []) as unknown as POPeriod[];
  return results.length > 0 ? results[0] : null;
}

export async function createPOPeriod(payload: POPeriodPayload): Promise<POPeriod> {
  const { data, error } = await supabase
    .from("po_periods" as any)
    .insert({
      name: payload.name,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: "open",
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as POPeriod;
}

export async function updatePOPeriod(payload: POPeriodUpdatePayload): Promise<void> {
  const updateData: Record<string, any> = {};
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
  if (payload.end_date !== undefined) updateData.end_date = payload.end_date;
  if (payload.status !== undefined) updateData.status = payload.status;

  const { error } = await supabase
    .from("po_periods" as any)
    .update(updateData)
    .eq("id", payload.id);

  if (error) throw error;
}

export async function deletePOPeriod(id: string): Promise<void> {
  const { error } = await supabase
    .from("po_periods" as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
