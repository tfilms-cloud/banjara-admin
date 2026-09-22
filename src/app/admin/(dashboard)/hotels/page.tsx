"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Eye, Star } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHotels } from "@/hooks/useHotels";
import { filterByPaths, firstNumber, firstText, refLabel } from "@/lib/records";
import { idOf } from "@/lib/utils";

const SEARCH_PATHS = ["name", "hotelName", "city", "address", "providerId.businessName"];

type StatusTab = "all" | "pending" | "approved" | "rejected" | "suspended";

const TABS: FilterTab<StatusTab>[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export default function HotelsPage() {
  const [tab, setTab] = useState<StatusTab>("pending");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useHotels();

  const rows = useMemo(() => {
    const items = data ?? [];
    const scoped =
      tab === "all"
        ? items
        : items.filter((hotel) => firstText(hotel, ["approvalStatus", "status"]) === tab);
    return filterByPaths(scoped, debouncedSearch, SEARCH_PATHS);
  }, [data, tab, debouncedSearch]);

  const columns: Column<unknown>[] = [
    {
      key: "hotel",
      header: "Hotel",
      render: (hotel) => (
        <div className="min-w-0">
          <Link
            href={`/admin/hotels/${idOf(hotel)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {firstText(hotel, ["name", "hotelName"], "Hotel")}
          </Link>
          <p className="truncate text-xs text-muted">{firstText(hotel, ["address"], "—")}</p>
        </div>
      ),
    },
    { key: "city", header: "City", render: (hotel) => firstText(hotel, ["city"]) },
    {
      key: "provider",
      header: "Provider",
      secondary: true,
      render: (hotel) => refLabel((hotel as Record<string, unknown>)?.providerId),
    },
    {
      key: "rating",
      header: "Rating",
      secondary: true,
      render: (hotel) => {
        const rating = firstNumber(hotel, ["rating", "starRating"], -1);
        return rating >= 0 ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 text-amber" aria-hidden />
            {rating.toFixed(1)}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "rooms",
      header: "Rooms",
      secondary: true,
      align: "right",
      render: (hotel) => firstNumber(hotel, ["totalRooms", "roomCount"]) || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (hotel) => {
        const status = firstText(hotel, ["approvalStatus", "status", "verificationStatus"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (hotel) => (
        <Link href={`/admin/hotels/${idOf(hotel)}`}>
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
        title="Hotels"
        description="Hotel applications and live properties from hospitality partners."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search hotel or city…" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(hotel, index) => idOf(hotel) || `hotel-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Building2}
        emptyTitle={tab === "all" ? "No hotels listed" : `No ${tab} hotels`}
        emptyDescription="Hotels added by providers appear here for review. Travelers only see approved listings."
        caption={`${rows.length} hotel${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
