"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Route } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRoutes } from "@/hooks/useRoutes";
import { filterByPaths, firstNumber, firstText, refLabel } from "@/lib/records";
import { formatCurrency, idOf } from "@/lib/utils";

const SEARCH_PATHS = [
  "name",
  "routeName",
  "origin",
  "destination",
  "from",
  "to",
  "originCity",
  "destinationCity",
];

export default function RoutesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useRoutes();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, SEARCH_PATHS),
    [data, debouncedSearch]
  );

  const columns: Column<unknown>[] = [
    {
      key: "route",
      header: "Route",
      render: (route) => (
        <Link
          href={`/admin/transport/routes/${idOf(route)}`}
          className="font-medium text-navy hover:text-sky hover:underline"
        >
          {firstText(route, ["name", "routeName"], "Route")}
        </Link>
      ),
    },
    {
      key: "origin",
      header: "Origin",
      render: (route) => firstText(route, ["origin", "originCity", "from"]),
    },
    {
      key: "destination",
      header: "Destination",
      render: (route) => firstText(route, ["destination", "destinationCity", "to"]),
    },
    {
      key: "distance",
      header: "Distance",
      secondary: true,
      align: "right",
      render: (route) => {
        const distance = firstNumber(route, ["distanceKm", "distance"]);
        return distance ? `${distance} km` : "—";
      },
    },
    {
      key: "fare",
      header: "Base fare",
      secondary: true,
      align: "right",
      render: (route) => {
        const fare = firstNumber(route, ["baseFare", "fare", "price"]);
        return fare ? formatCurrency(fare) : "—";
      },
    },
    {
      key: "provider",
      header: "Provider",
      secondary: true,
      render: (route) => refLabel((route as Record<string, unknown>)?.providerId),
    },
    {
      key: "status",
      header: "Status",
      render: (route) => {
        const status = firstText(route, ["status"], "");
        return status && status !== "—" ? <StatusBadge status={status} /> : <span>—</span>;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (route) => (
        <Link href={`/admin/transport/routes/${idOf(route)}`}>
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
        title="Routes"
        description="Transport corridors published by BANJARA providers."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search origin or destination…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(route, index) => idOf(route) || `route-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Route}
        emptyTitle="No routes published"
        emptyDescription="Routes created by transport providers will appear here."
        caption={`${rows.length} route${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
