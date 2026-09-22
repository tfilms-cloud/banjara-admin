"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bus, ImageIcon, Star } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { VehicleActions } from "@/components/vehicle-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicle } from "@/hooks/useVehicles";
import { firstNumber, firstText, optionalText, refLabel } from "@/lib/records";
import { formatDateTime, idOf } from "@/lib/utils";

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = useVehicle(id);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const vehicle = (data?.vehicle ?? data) as Record<string, unknown> | undefined;
  const seatSummary = data?.seatSummary;

  const images = useMemo(() => {
    const raw = vehicle?.images;
    return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
  }, [vehicle]);

  const provider = vehicle?.providerId as Record<string, unknown> | string | undefined;
  const providerId = idOf(provider);
  const providerName = refLabel(provider);
  const status = firstText(vehicle, ["status"], "");

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Vehicle" description="Loading vehicle details…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className="space-y-5">
        <PageHeader title="Vehicle" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this vehicle"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/admin/transport/vehicles"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to vehicles
      </Link>

      <PageHeader
        title={firstText(vehicle, ["name", "registrationNumber"], "Vehicle")}
        description={[
          firstText(vehicle, ["type"], ""),
          firstText(vehicle, ["registrationNumber"], ""),
        ]
          .filter((part) => part && part !== "—")
          .join(" · ")}
        actions={<VehicleActions vehicle={vehicle} size="md" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        {optionalText(vehicle, ["rejectionReason"]) ? (
          <span className="text-sm text-danger">
            Reason: {optionalText(vehicle, ["rejectionReason"])}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Seats"
          value={seatSummary?.totalSeats ?? firstNumber(vehicle, ["seatCount", "totalSeats"])}
          hint="Vehicle capacity"
          icon={Bus}
          tone="navy"
        />
        <StatCard label="Active Trips" value={seatSummary?.activeTrips ?? 0} tone="sky" />
        <StatCard label="Booked Seats" value={seatSummary?.bookedSeats ?? 0} tone="amber" />
        <StatCard label="Available Seats" value={seatSummary?.availableSeats ?? 0} tone="green" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle information</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Vehicle name" value={firstText(vehicle, ["name"])} />
              <DetailRow label="Type" value={firstText(vehicle, ["type"])} />
              <DetailRow label="Make" value={firstText(vehicle, ["brand", "make"])} />
              <DetailRow label="Model" value={firstText(vehicle, ["vehicleModel", "model"])} />
              <DetailRow label="Year" value={String(firstNumber(vehicle, ["year"]) || "—")} />
              <DetailRow
                label="Registration"
                value={firstText(vehicle, ["registrationNumber"])}
              />
              <DetailRow
                label="Total seats"
                value={String(firstNumber(vehicle, ["seatCount", "totalSeats"]) || "—")}
              />
              <DetailRow label="Status" value={<StatusBadge status={status} />} />
              <DetailRow label="Created" value={formatDateTime(String(vehicle.createdAt ?? ""))} />
              <DetailRow label="Updated" value={formatDateTime(String(vehicle.updatedAt ?? ""))} />
              {vehicle.approvedAt ? (
                <DetailRow
                  label="Approved"
                  value={formatDateTime(String(vehicle.approvedAt))}
                />
              ) : null}
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-navy">{providerName}</p>
              {typeof provider === "object" && provider?.verificationStatus === "approved" ? (
                <p className="inline-flex items-center gap-1 text-sm text-green">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                  Verified
                </p>
              ) : null}
              {typeof provider === "object" && provider?.rating != null ? (
                <p className="inline-flex items-center gap-1 text-sm text-muted">
                  <Star className="h-4 w-4 text-amber" aria-hidden />
                  Rating: {String(provider.rating)}
                </p>
              ) : null}
            </div>
            {providerId ? (
              <Link href={`/admin/providers/${providerId}`}>
                <Button variant="outline" size="sm">
                  View Provider
                </Button>
              </Link>
            ) : null}
            <p className="text-xs text-muted">
              Provider details are read-only from this screen.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle images</CardTitle>
        </CardHeader>
        <CardContent>
          {images.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {images.map((src) => (
                <button
                  key={src}
                  type="button"
                  className="overflow-hidden rounded-xl border border-border bg-slate-50"
                  onClick={() => setLightbox(src)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Vehicle" className="h-36 w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted">
              <ImageIcon className="h-4 w-4" aria-hidden />
              No images uploaded for this vehicle.
            </div>
          )}
        </CardContent>
      </Card>

      {seatSummary?.trips && seatSummary.trips.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Active trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seatSummary.trips.map((trip) => {
              const t = trip as Record<string, unknown>;
              return (
                <div
                  key={String(t.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-navy">
                    {String(t.origin)} → {String(t.destination)}
                  </span>
                  <span className="text-muted">
                    {String(t.departureDate)} · booked {String(t.bookedSeats)} /{" "}
                    {String(t.totalSeats)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {status === "pending" ? (
        <Card className="border-amber/30 bg-amber/5">
          <CardHeader>
            <CardTitle>Vehicle verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Status: <StatusBadge status="pending" /> — review details and images before deciding.
            </p>
            <VehicleActions vehicle={vehicle} size="md" />
          </CardContent>
        </Card>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Vehicle preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
