"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bus, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useVehicles } from "@/hooks/useVehicles";
import { filterByPaths, firstNumber, firstText, refLabel } from "@/lib/records";
import { idOf } from "@/lib/utils";

type StatusTab = "all" | "pending" | "active" | "rejected" | "suspended";
type TypeTab = "all" | "car" | "van" | "bus" | "coaster" | "suv" | "other";
type SeatTab = "all" | "1-7" | "8-18" | "19-30" | "31+";

const STATUS_TABS: FilterTab<StatusTab>[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const TYPE_TABS: FilterTab<TypeTab>[] = [
  { value: "all", label: "All types" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
  { value: "coaster", label: "Coaster" },
  { value: "suv", label: "SUV" },
  { value: "other", label: "Other" },
];

const SEAT_TABS: FilterTab<SeatTab>[] = [
  { value: "all", label: "Any seats" },
  { value: "1-7", label: "1–7" },
  { value: "8-18", label: "8–18" },
  { value: "19-30", label: "19–30" },
  { value: "31+", label: "31+" },
];

const SEARCH_PATHS = [
  "registrationNumber",
  "name",
  "brand",
  "make",
  "vehicleModel",
  "model",
  "providerId.businessName",
];

function matchesSeatBucket(seats: number, bucket: SeatTab) {
  if (bucket === "all") return true;
  if (bucket === "1-7") return seats >= 1 && seats <= 7;
  if (bucket === "8-18") return seats >= 8 && seats <= 18;
  if (bucket === "19-30") return seats >= 19 && seats <= 30;
  return seats >= 31;
}

export default function VehiclesPage() {
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [typeTab, setTypeTab] = useState<TypeTab>("all");
  const [seatTab, setSeatTab] = useState<SeatTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data, isPending, isError, error, refetch, isFetching } = useVehicles({
    status: statusTab === "all" ? undefined : statusTab,
    type: typeTab === "all" ? undefined : typeTab,
  });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const searched = filterByPaths(items, debouncedSearch, SEARCH_PATHS);
    return searched.filter((vehicle) => {
      const seats = Number(
        firstNumber(vehicle, ["seatCount", "totalSeats", "capacity", "seats"]) || 0
      );
      return matchesSeatBucket(seats, seatTab);
    });
  }, [data, debouncedSearch, seatTab]);

  const stats = data?.stats;

  const columns: Column<unknown>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      render: (vehicle) => (
        <div className="min-w-0">
          <Link
            href={`/admin/transport/vehicles/${idOf(vehicle)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {firstText(vehicle, ["name", "registrationNumber"], "Vehicle")}
          </Link>
          <p className="truncate text-xs text-muted">
            {firstText(vehicle, ["registrationNumber"], "—")}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      secondary: true,
      render: (vehicle) => (
        <span className="capitalize">{firstText(vehicle, ["type", "vehicleType"])}</span>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      secondary: true,
      render: (vehicle) => refLabel((vehicle as Record<string, unknown>)?.providerId),
    },
    {
      key: "capacity",
      header: "Seats",
      secondary: true,
      align: "right",
      render: (vehicle) => {
        const seats = firstNumber(vehicle, ["seatCount", "totalSeats", "capacity", "seats"]);
        return seats ? String(seats) : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (vehicle) => {
        const status = firstText(vehicle, ["status"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (vehicle) => (
        <Link href={`/admin/transport/vehicles/${idOf(vehicle)}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" aria-hidden />
            View
          </Button>
        </Link>
      ),
    },
  ];

  const emptyTitle =
    statusTab === "pending" ? "No vehicles waiting for approval" : "No vehicles yet";
  const emptyDescription =
    statusTab === "pending"
      ? "New vehicles submitted by transport providers will appear here for review."
      : "Vehicles submitted by approved transport providers will appear here.";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vehicles"
        description="Review and approve transport fleet vehicles across BANJARA."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Vehicles" value={stats?.total ?? "—"} icon={Bus} tone="navy" />
        <StatCard label="Pending Approval" value={stats?.pending ?? "—"} tone="amber" />
        <StatCard label="Active Vehicles" value={stats?.active ?? "—"} tone="green" />
        <StatCard label="Suspended" value={stats?.suspended ?? "—"} tone="danger" />
      </div>

      <div className="space-y-3">
        <FilterTabs tabs={STATUS_TABS} value={statusTab} onChange={setStatusTab} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs tabs={TYPE_TABS} value={typeTab} onChange={setTypeTab} />
          <FilterTabs tabs={SEAT_TABS} value={seatTab} onChange={setSeatTab} />
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search registration, make or model…"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(vehicle, index) => idOf(vehicle) || `vehicle-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Bus}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        caption={`${rows.length} vehicle${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
