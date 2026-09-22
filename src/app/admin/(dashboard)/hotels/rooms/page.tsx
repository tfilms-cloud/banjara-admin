"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRooms } from "@/hooks/useRooms";
import { filterByPaths, firstNumber, firstText, refLabel } from "@/lib/records";
import { formatCurrency, idOf } from "@/lib/utils";

const SEARCH_PATHS = ["name", "roomType", "type", "roomNumber", "hotelId.name"];

export default function RoomsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useRooms();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, SEARCH_PATHS),
    [data, debouncedSearch]
  );

  const columns: Column<unknown>[] = [
    {
      key: "room",
      header: "Room",
      render: (room) => (
        <div className="min-w-0">
          <Link
            href={`/admin/hotels/rooms/${idOf(room)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {firstText(room, ["name", "roomType", "type", "roomNumber"], "Room")}
          </Link>
          <p className="truncate text-xs text-muted">
            {refLabel((room as Record<string, unknown>)?.hotelId, "—")}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      secondary: true,
      render: (room) => <span className="capitalize">{firstText(room, ["roomType", "type"])}</span>,
    },
    {
      key: "occupancy",
      header: "Occupancy",
      secondary: true,
      align: "right",
      render: (room) => firstNumber(room, ["maxOccupancy", "capacity", "occupancy"]) || "—",
    },
    {
      key: "price",
      header: "Price / night",
      align: "right",
      render: (room) => {
        const price = firstNumber(room, ["pricePerNight", "price", "rate"]);
        return price ? formatCurrency(price) : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      render: (room) => {
        const status = firstText(room, ["status", "availability"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (room) => (
        <Link href={`/admin/hotels/rooms/${idOf(room)}`}>
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
        title="Rooms"
        description="Every room type published across BANJARA partner hotels."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search room or hotel…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(room, index) => idOf(room) || `room-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={BedDouble}
        emptyTitle="No rooms published"
        emptyDescription="Room types created by hotel partners will appear here."
        caption={`${rows.length} room${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
