import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, getSalesProfiles, getAllProfiles, updateProfileFullName, updateProfileRole, type Profile, type SalesProfile } from "@/services/profile";

const PROFILE_QUERY_KEY = ["profile"];
const SALES_PROFILES_QUERY_KEY = ["profiles", "sales"];
const ALL_PROFILES_QUERY_KEY = ["profiles", "all"];

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

export function useSalesProfiles(role: string | null) {
  const isAdminOrSuperadmin = role === "admin" || role === "superadmin";
  return useQuery<SalesProfile[], Error>({
    queryKey: SALES_PROFILES_QUERY_KEY,
    queryFn: getSalesProfiles,
    enabled: isAdminOrSuperadmin,
  });
}

export function useAllProfiles(isSuperadmin: boolean) {
  return useQuery<Profile[], Error>({
    queryKey: ALL_PROFILES_QUERY_KEY,
    queryFn: getAllProfiles,
    enabled: isSuperadmin,
  });
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { profileId: string; role: string }>({
    mutationFn: ({ profileId, role }) => updateProfileRole(profileId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_PROFILES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SALES_PROFILES_QUERY_KEY });
    },
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

