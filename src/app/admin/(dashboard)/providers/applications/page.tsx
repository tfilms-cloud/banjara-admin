"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Eye } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { ProviderActions } from "@/components/provider-actions";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProviders } from "@/hooks/useProviders";
import { filterByPaths } from "@/lib/records";
import { formatDate, idOf } from "@/lib/utils";
import type { ProviderProfile } from "@/types/admin";

type StatusTab = "all" | "pending" | "approved" | "rejected" | "suspended";

const TABS: FilterTab<StatusTab>[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

const SEARCH_PATHS = [
  "businessName",
  "ownerName",
  "email",
  "phone",
  "city",
  "userId.name",
  "userId.email",
];

export default function ProviderApplicationsPage() {
  const [tab, setTab] = useState<StatusTab>("pending");
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
      header: "Business",
      render: (provider) => (
        <div className="min-w-0">
          <Link
            href={`/admin/providers/applications/${idOf(provider)}`}
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
      key: "type",
      header: "Services",
      secondary: true,
      render: (provider) => {
        const types = provider.providerType ?? provider.services ?? [];
        return types.length ? (
          <span className="text-xs capitalize text-muted">{types.join(", ")}</span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "submitted",
      header: "Submitted",
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
      header: "Actions",
      align: "right",
      render: (provider) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/providers/applications/${idOf(provider)}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" aria-hidden />
              View
            </Button>
          </Link>
          <ProviderActions provider={provider} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Provider Applications"
        description="Review, approve and moderate businesses applying to join BANJARA."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search business, owner or city…"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(provider, index) => idOf(provider) || `provider-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={ClipboardList}
        emptyTitle={
          tab === "all" ? "No applications yet" : `No ${tab} applications`
        }
        emptyDescription="Applications submitted by providers will appear here for review."
        caption={`${rows.length} application${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
