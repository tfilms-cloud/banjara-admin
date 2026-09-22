"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Eye, Star } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProviders } from "@/hooks/useProviders";
import { filterByPaths } from "@/lib/records";
import { formatDate, idOf } from "@/lib/utils";
import type { ProviderProfile } from "@/types/admin";

type StatusTab = "all" | "approved" | "pending" | "suspended" | "rejected";

const TABS: FilterTab<StatusTab>[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

const SEARCH_PATHS = ["businessName", "ownerName", "email", "phone", "city"];

export default function ProvidersPage() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data, isPending, isError, error, refetch, isFetching } = useProviders({
    status: tab === "all" ? undefined : tab,
    search: debouncedSearch || undefined,
    limit: 100,
  });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const scoped =
      tab === "all" ? items : items.filter((item) => item.verificationStatus === tab);
    return filterByPaths(scoped, debouncedSearch, SEARCH_PATHS);
  }, [data, tab, debouncedSearch]);

  const columns: Column<ProviderProfile>[] = [
    {
      key: "business",
      header: "Provider",
      render: (provider) => (
        <div className="min-w-0">
          <Link
            href={`/admin/providers/${idOf(provider)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {provider.businessName || "Unnamed business"}
          </Link>
          <p className="truncate text-xs text-muted">{provider.ownerName || "—"}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      secondary: true,
      render: (provider) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{provider.email || "—"}</p>
          <p className="truncate text-xs text-muted">{provider.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      secondary: true,
      render: (provider) => provider.city || "—",
    },
    {
      key: "rating",
      header: "Rating",
      secondary: true,
      render: (provider) =>
        provider.rating !== undefined ? (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 text-amber" aria-hidden />
            {provider.rating.toFixed(1)}
            <span className="text-xs text-muted">({provider.totalReviews ?? 0})</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "joined",
      header: "Joined",
      secondary: true,
      render: (provider) => (
        <span className="text-xs text-muted">{formatDate(provider.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (provider) => <StatusBadge status={provider.verificationStatus} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (provider) => (
        <Link href={`/admin/providers/${idOf(provider)}`}>
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
        title="Providers"
        description="Every transport and hospitality partner on the BANJARA network."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search providers…" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(provider, index) => idOf(provider) || `provider-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={BadgeCheck}
        emptyTitle="No providers found"
        emptyDescription="Approved providers will be listed here once applications are accepted."
        caption={`${rows.length} provider${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
