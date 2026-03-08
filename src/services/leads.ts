import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Lead = Tables<"leads">;

export const fetchLeads = async (): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from("leads")
    .select("*, profiles(full_name), products(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};
