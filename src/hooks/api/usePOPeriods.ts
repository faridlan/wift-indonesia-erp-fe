import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPOPeriods,
  getActivePOPeriod,
  createPOPeriod,
  updatePOPeriod,
  deletePOPeriod,
  type POPeriod,
  type POPeriodPayload,
  type POPeriodUpdatePayload,
} from "@/services/po-periods";

const PO_PERIODS_KEY = ["po_periods"];
const ACTIVE_PO_KEY = ["active_po_period"];

export function usePOPeriods() {
  return useQuery<POPeriod[], Error>({
    queryKey: PO_PERIODS_KEY,
    queryFn: getPOPeriods,
  });
}

export function useActivePOPeriod() {
  return useQuery<POPeriod | null, Error>({
    queryKey: ACTIVE_PO_KEY,
    queryFn: getActivePOPeriod,
  });
}

export function useCreatePOPeriod() {
  const queryClient = useQueryClient();
  return useMutation<POPeriod, Error, POPeriodPayload>({
    mutationFn: createPOPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_PO_KEY });
    },
  });
}

export function useUpdatePOPeriod() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, POPeriodUpdatePayload>({
    mutationFn: updatePOPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_PO_KEY });
    },
  });
}

export function useDeletePOPeriod() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deletePOPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_PO_KEY });
    },
  });
}
