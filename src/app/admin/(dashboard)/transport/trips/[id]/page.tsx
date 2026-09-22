"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { ResourceDetail } from "@/components/resource-detail";
import { useTrip } from "@/hooks/useTrips";
import { firstNumber, firstText, refLabel, toRecord } from "@/lib/records";
import { formatCurrency, formatDate } from "@/lib/utils";

function tripRouteLabel(trip: unknown) {
  const origin = firstText(trip, ["origin"], "");
  const destination = firstText(trip, ["destination"], "");
  if (origin && destination) return `${origin} → ${destination}`;
  return origin || destination || firstText(trip, ["description", "tripNumber", "name"], "Trip");
}

function tripDepartureLabel(trip: unknown) {
  const date = firstText(trip, ["departureDate"], "");
  const time = firstText(trip, ["departureTime"], "");
  if (date && time) return `${formatDate(date)} · ${time}`;
  if (date) return formatDate(date);
  if (time) return time;
  return "—";
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = useTrip(id);

  const record = toRecord(data);
  const journeyType = firstText(data, ["journeyType"], "one_way");
  const status = firstText(data, ["status"], "");
  const vehicle = refLabel(record.vehicleId);
  const provider = refLabel(record.providerId);
  const available = firstNumber(data, ["availableSeats"], -1);
  const total = firstNumber(data, ["totalSeats"], -1);
  const price = firstNumber(data, ["price", "fare"], 0);
  const returnDate = firstText(data, ["returnDate"], "");
  const returnTime = firstText(data, ["returnTime"], "");

  return (
    <ResourceDetail
      backHref="/admin/transport/trips"
      backLabel="Back to trips"
      title={tripRouteLabel(data)}
      description={[
        journeyType === "round_trip" ? "Round trip" : "One way",
        status,
        provider !== "—" ? provider : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      record={data}
      loading={isPending}
      error={isError ? error : undefined}
      refetching={isFetching}
      onRetry={() => void refetch()}
      detailsTitle="Trip details"
      skipFields={[
        "seatLayout",
        "pickupPoints",
        "dropoffPoints",
        "providerId",
        "vehicleId",
        "routeId",
      ]}
    >
      {!isPending && data ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Departure</p>
            <p className="mt-1 text-sm font-medium text-navy">{tripDepartureLabel(data)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Vehicle</p>
            <p className="mt-1 text-sm font-medium text-navy">{vehicle}</p>
            {firstText(record.vehicleId, ["registrationNumber"], "") ? (
              <p className="text-xs text-muted">
                {firstText(record.vehicleId, ["registrationNumber"])}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Seats</p>
            <p className="mt-1 text-sm font-medium text-navy">
              {available >= 0 && total >= 0 ? `${available} / ${total}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Fare</p>
            <p className="mt-1 text-sm font-medium text-navy">
              {price ? formatCurrency(price) : "—"}
            </p>
            {status ? (
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            ) : null}
          </div>
          {journeyType === "round_trip" && (returnDate || returnTime) ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Return</p>
              <p className="mt-1 text-sm font-medium text-navy">
                {[returnDate ? formatDate(returnDate) : null, returnTime].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}
          {firstText(data, ["description"], "") ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Notes</p>
              <p className="mt-1 text-sm text-navy">{firstText(data, ["description"])}</p>
            </div>
          ) : null}
          {idOfVehicle(record.vehicleId) ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Link
                href={`/admin/transport/vehicles/${idOfVehicle(record.vehicleId)}`}
                className="text-sm text-sky hover:underline"
              >
                Open vehicle
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </ResourceDetail>
  );
}

function idOfVehicle(vehicle: unknown) {
  if (!vehicle || typeof vehicle !== "object") return "";
  const obj = vehicle as Record<string, unknown>;
  return String(obj.id ?? obj._id ?? "");
}
