"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MapPin } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePickupPoints } from "@/hooks/useRoutes";
import { filterByPaths, firstText, refLabel } from "@/lib/records";
import { idOf } from "@/lib/utils";

const SEARCH_PATHS = ["name", "city", "address", "landmark", "area"];

export default function PickupPointsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = usePickupPoints();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, SEARCH_PATHS),
    [data, debouncedSearch]
  );

  const columns: Column<unknown>[] = [
    {
      key: "name",
      header: "Pickup point",
      render: (point) => (
        <Link
          href={`/admin/transport/pickup-points/${idOf(point)}`}
          className="font-medium text-navy hover:text-sky hover:underline"
        >
          {firstText(point, ["name", "title"], "Pickup point")}
        </Link>
      ),
    },
    { key: "city", header: "City", render: (point) => firstText(point, ["city"]) },
    {
      key: "address",
      header: "Address",
      secondary: true,
      render: (point) => (
        <span className="line-clamp-2 text-sm text-muted">
          {firstText(point, ["address", "landmark", "area"])}
        </span>
      ),
    },
    {
      key: "route",
      header: "Route",
      secondary: true,
      render: (point) => refLabel((point as Record<string, unknown>)?.routeId),
    },
    {
      key: "status",
      header: "Status",
      render: (point) => {
        const status = firstText(point, ["status"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (point) => (
        <Link href={`/admin/transport/pickup-points/${idOf(point)}`}>
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
        title="Pickup Points"
        description="Boarding locations travellers can choose when booking transport."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search name, city or area…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(point, index) => idOf(point) || `pickup-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={MapPin}
        emptyTitle="No pickup points"
        emptyDescription="Boarding points defined by providers will appear here."
        caption={`${rows.length} pickup point${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
