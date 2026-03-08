import { useQuery } from "@tanstack/react-query";
import { fetchLeads } from "@/services/leads";

export const useLeads = () => {
  return useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
  });
};
