import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfileFullName, type Profile } from "@/services/profile";

const PROFILE_QUERY_KEY = ["profile"];

export function useProfile(userId: string | undefined) {
  return useQuery<Profile | null, Error>({
    queryKey: [...PROFILE_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve(null);
      }
      return getProfile(userId);
    },
    enabled: !!userId,
  });
}

export function useUpdateProfileFullName(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (fullName: string) => {
      if (!userId) {
        return Promise.resolve();
      }
      return updateProfileFullName(userId, fullName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

