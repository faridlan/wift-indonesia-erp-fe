import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function updateProfileFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);

  if (error) {
    throw error;
  }
}

export type SalesProfile = Pick<Profile, "id" | "full_name">;

export async function getSalesProfiles(): Promise<SalesProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "sales")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateProfileRole(profileId: string, role: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);

  if (error) {
    throw error;
  }
}

