"use client";

import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ResourceDetail } from "@/components/resource-detail";
import { useHotel } from "@/hooks/useHotels";
import { firstText, optionalText, toRecord } from "@/lib/records";
import {
  approveHotel,
  rejectHotel,
  requestHotelChanges,
  suspendHotel,
} from "@/services/admin.service";

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch, isFetching } = useHotel(id);

  const record = toRecord(data);
  const hotel = toRecord(record.hotel ?? data);
  const approvalStatus = firstText(hotel, ["approvalStatus"], "approved");
  const isVerified = Boolean(hotel.isVerified);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-hotel", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
  };

  const approve = useMutation({
    mutationFn: () => approveHotel(id),
    onSuccess: () => {
      toast.success("Hotel approved");
      invalidate();
      void refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Approval failed"),
  });

  const reject = useMutation({
    mutationFn: (reason: string) => rejectHotel(id, reason),
    onSuccess: () => {
      toast.success("Hotel rejected");
      invalidate();
      void refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reject failed"),
  });

  const suspend = useMutation({
    mutationFn: (reason: string) => suspendHotel(id, reason),
    onSuccess: () => {
      toast.success("Hotel suspended");
      invalidate();
      void refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Suspend failed"),
  });

  const requestChanges = useMutation({
    mutationFn: (reason: string) => requestHotelChanges(id, reason),
    onSuccess: () => {
      toast.success("Changes requested");
      invalidate();
      void refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Request failed"),
  });

  const promptReason = (action: (reason: string) => void, label: string) => {
    const reason = window.prompt(`${label} — reason (required):`);
    if (!reason?.trim()) {
      toast.error("A reason is required");
      return;
    }
    action(reason.trim());
  };

  return (
    <ResourceDetail
      backHref="/admin/hotels"
      backLabel="Back to hotels"
      title={firstText(hotel, ["name", "hotelName"], "Hotel")}
      description={[optionalText(hotel, ["address", "city"]), approvalStatus, isVerified ? "Verified" : null]
        .filter(Boolean)
        .join(" · ")}
      record={data}
      loading={isPending}
      error={isError ? error : undefined}
      refetching={isFetching}
      onRetry={() => void refetch()}
      detailsTitle="Hotel details"
    >
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <button
          type="button"
          className="rounded-lg bg-green px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={approve.isPending || approvalStatus === "approved"}
          onClick={() => approve.mutate()}
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-navy disabled:opacity-50"
          disabled={requestChanges.isPending}
          onClick={() => promptReason((reason) => requestChanges.mutate(reason), "Request changes")}
        >
          Request changes
        </button>
        <button
          type="button"
          className="rounded-lg border border-danger/30 bg-card px-3 py-2 text-sm font-medium text-danger disabled:opacity-50"
          disabled={reject.isPending}
          onClick={() => promptReason((reason) => reject.mutate(reason), "Reject hotel")}
        >
          Reject
        </button>
        <button
          type="button"
          className="rounded-lg border border-amber/40 bg-card px-3 py-2 text-sm font-medium text-amber disabled:opacity-50"
          disabled={suspend.isPending}
          onClick={() => promptReason((reason) => suspend.mutate(reason), "Suspend hotel")}
        >
          Suspend
        </button>
      </div>
    </ResourceDetail>
  );
}
