"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveProvider,
  listProviders,
  rejectProvider,
  suspendProvider,
} from "@/services/admin.service";
import { adminKeys, type ProviderListParams } from "@/lib/query-keys";

export function useProviders(params?: ProviderListParams) {
  return useQuery({
    queryKey: adminKeys.providers(params),
    queryFn: () => listProviders(params),
  });
}

function useProviderMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(successMessage);
      void queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Action failed. Please try again.");
    },
  });
}

export function useApproveProvider() {
  return useProviderMutation<string>(
    (id) => approveProvider(id),
    "Provider approved and now live on BANJARA."
  );
}

export function useRejectProvider() {
  return useProviderMutation<{ id: string; reason?: string }>(
    ({ id, reason }) => rejectProvider(id, reason),
    "Application rejected."
  );
}

export function useSuspendProvider() {
  return useProviderMutation<{ id: string; reason?: string }>(
    ({ id, reason }) => suspendProvider(id, reason),
    "Provider suspended."
  );
}
