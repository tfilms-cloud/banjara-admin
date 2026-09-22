"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSupport, listSupport, updateSupport } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function useSupportTickets() {
  return useQuery({
    queryKey: adminKeys.supportTickets(),
    queryFn: listSupport,
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: adminKeys.supportTicket(id),
    queryFn: () => getSupport(id),
    enabled: Boolean(id),
  });
}

export function useUpdateSupportTicket(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { status?: string; priority?: string }) => updateSupport(id, body),
    onSuccess: () => {
      toast.success("Ticket updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
      void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not update the ticket.");
    },
  });
}
