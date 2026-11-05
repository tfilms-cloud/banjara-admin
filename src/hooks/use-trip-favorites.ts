"use client";
import { useMutation, useQuery, useQueryClient } from "@/lib/live-query";
import { toast } from "sonner";
import { useCustomerAuth } from "@/components/providers/customer-auth-provider";
import { customerDel, customerGet, customerPost } from "@/lib/customer-api";
import { asArray, idOf } from "@/lib/utils";

type Favorite = { id: string; targetId: string };
const GUEST_KEY = "banjara_web_guest_saved_trips";
export function useTripFavorites() {
  const { user: signedIn, loading } = useCustomerAuth();
  // Favorites are a traveller feature (the API allows customers only). Providers keep
  // theirs on this device, like guests, instead of getting a 403.
  const user = signedIn?.role === "customer" ? signedIn : null;
  const client = useQueryClient();
  const key = ["customer", "home-favorites", user?.id ?? "guest"];
  const query = useQuery({
    queryKey: key,
    enabled: !loading,
    queryFn: async (): Promise<Favorite[]> => {
      if (!user) {
        try {
          const raw: unknown = JSON.parse(
            localStorage.getItem(GUEST_KEY) ?? "[]",
          );
          return Array.isArray(raw)
            ? raw
                .filter((id): id is string => typeof id === "string")
                .map((id) => ({ id, targetId: id }))
            : [];
        } catch {
          return [];
        }
      }
      return asArray<Record<string, unknown>>(await customerGet("/favorites"))
        .filter((item) => item.targetType === "trip")
        .map((item) => ({ id: idOf(item), targetId: idOf(item.targetId) }));
    },
  });
  const mutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!query.isSuccess)
        throw new Error("Saved rides could not be loaded. Please try again.");
      const current = query.data ?? [];
      const existing = current.find((item) => item.targetId === tripId);
      if (!user) {
        const next = existing
          ? current.filter((item) => item.targetId !== tripId)
          : [...current, { id: tripId, targetId: tripId }];
        localStorage.setItem(
          GUEST_KEY,
          JSON.stringify(next.map((item) => item.targetId)),
        );
        return;
      }
      if (existing) await customerDel(`/favorites/${existing.id}`);
      else
        await customerPost("/favorites", {
          targetType: "trip",
          targetId: tripId,
        });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
    onError: (error) => {
      toast.error(error.message);
      void query.refetch();
    },
  });
  return {
    saved: new Set((query.data ?? []).map((item) => item.targetId)),
    toggle: (id: string) => mutation.mutate(id),
    pending: loading || query.isPending || mutation.isPending,
  };
}
