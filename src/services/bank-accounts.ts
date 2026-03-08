import { supabase } from "@/integrations/supabase/client";

export interface BankAccount {
  id: string;
  profile_id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string | null;
}

export async function getBankAccounts(profileId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BankAccount[];
}

export async function createBankAccount(
  profileId: string,
  bankName: string,
  accountNumber: string,
  accountHolder: string
): Promise<BankAccount> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ profile_id: profileId, bank_name: bankName, account_number: accountNumber, account_holder: accountHolder })
    .select()
    .single();
  if (error) throw error;
  return data as BankAccount;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function getBankAccountsBySalesId(salesId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("profile_id", salesId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BankAccount[];
}
