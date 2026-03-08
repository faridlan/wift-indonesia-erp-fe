import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBankAccounts, createBankAccount, deleteBankAccount, type BankAccount } from "@/services/bank-accounts";

const BANK_ACCOUNTS_KEY = ["bank_accounts"];

export function useBankAccounts(profileId: string | undefined) {
  return useQuery<BankAccount[], Error>({
    queryKey: [...BANK_ACCOUNTS_KEY, profileId],
    queryFn: () => getBankAccounts(profileId!),
    enabled: !!profileId,
  });
}

export function useCreateBankAccount(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { bankName: string; accountNumber: string; accountHolder: string }) =>
      createBankAccount(profileId!, data.bankName, data.accountNumber, data.accountHolder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY, profileId] });
    },
  });
}

export function useDeleteBankAccount(profileId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBankAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...BANK_ACCOUNTS_KEY, profileId] });
    },
  });
}
