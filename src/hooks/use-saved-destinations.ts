"use client";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";

/** The mobile favorites API has no destination target; these saves stay on this device. */
export function useSavedDestinations() {
  const { user, loading } = useCustomerAuth();
  const client = useQueryClient();
  const storageKey = `banjara_saved_valleys_${user?.id ?? "guest"}`;
  const queryKey = ["customer", "saved-destinations", user?.id ?? "guest"];
  const query = useQuery({
    queryKey,
    enabled: !loading,
    queryFn: async (): Promise<string[]> => {
      try {
        const raw: unknown = JSON.parse(
          localStorage.getItem(storageKey) ?? "[]",
        );
        return Array.isArray(raw)
          ? raw.filter((item): item is string => typeof item === "string")
          : [];
      } catch {
        return [];
      }
    },
  });
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const current = query.data ?? [];
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => {
      client.setQueryData(queryKey, next);
    },
    onError: () =>
      toast.error("Couldn’t save this destination on your device."),
  });
  return {
    saved: new Set(query.data ?? []),
    pending: loading || query.isPending || mutation.isPending,
    toggle: (id: string) => mutation.mutate(id),
  };
}
