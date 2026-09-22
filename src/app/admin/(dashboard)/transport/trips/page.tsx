"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTrips } from "@/hooks/useTrips";
import { filterByPaths, firstNumber, firstText, refLabel, toRecord } from "@/lib/records";
import { formatCurrency, formatDate, idOf } from "@/lib/utils";

const SEARCH_PATHS = [
  "origin",
  "destination",
  "departureDate",
  "departureTime",
  "description",
  "status",
  "journeyType",
  "vehicleId.name",
  "vehicleId.registrationNumber",
  "providerId.businessName",
];

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

function tripSubtitle(trip: unknown) {
  const record = toRecord(trip);
  const journey =
    firstText(trip, ["journeyType"], "") === "round_trip" ? "Round trip" : "One way";
  const provider = refLabel(record.providerId, "");
  const parts = [journey, provider].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

export default function TripsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useTrips();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, SEARCH_PATHS),
    [data, debouncedSearch]
  );

  const columns: Column<unknown>[] = [
    {
      key: "trip",
      header: "Trip",
      render: (trip) => (
        <div className="min-w-0">
          <Link
            href={`/admin/transport/trips/${idOf(trip)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {tripRouteLabel(trip)}
          </Link>
          <p className="truncate text-xs text-muted">{tripSubtitle(trip)}</p>
        </div>
      ),
    },
    {
      key: "departure",
      header: "Departure",
      render: (trip) => <span className="text-sm whitespace-nowrap">{tripDepartureLabel(trip)}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      secondary: true,
      render: (trip) => {
        const vehicle = toRecord(trip).vehicleId;
        const name = refLabel(vehicle);
        const reg = firstText(vehicle, ["registrationNumber"], "");
        if (name === "—" && !reg) return "—";
        return reg && name !== "—" ? `${name} · ${reg}` : name !== "—" ? name : reg;
      },
    },
    {
      key: "seats",
      header: "Seats",
      secondary: true,
      align: "right",
      render: (trip) => {
        const available = firstNumber(trip, ["availableSeats", "seatsAvailable"], -1);
        const total = firstNumber(trip, ["totalSeats", "capacity"], -1);
        if (available < 0 && total < 0) return "—";
        if (total < 0) return String(available);
        return `${available < 0 ? "?" : available} / ${total}`;
      },
    },
    {
      key: "fare",
      header: "Fare",
      secondary: true,
      align: "right",
      render: (trip) => {
        const fare = firstNumber(trip, ["fare", "price", "baseFare"]);
        return fare ? formatCurrency(fare) : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (trip) => {
        const status = firstText(trip, ["status", "tripStatus"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (trip) => (
        <Link href={`/admin/transport/trips/${idOf(trip)}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" aria-hidden />
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trips"
        description="Scheduled departures across every BANJARA transport route."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search trip, route or vehicle…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(trip, index) => idOf(trip) || `trip-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={CalendarClock}
        emptyTitle="No trips scheduled"
        emptyDescription="Departures published by transport providers will appear here."
        caption={`${rows.length} trip${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
