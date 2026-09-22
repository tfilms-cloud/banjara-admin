"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, LifeBuoy } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSupportTickets } from "@/hooks/useSupport";
import { filterByPaths, refLabel } from "@/lib/records";
import { formatDate, idOf } from "@/lib/utils";
import type { SupportTicket } from "@/types/admin";

type TicketTab = "all" | "open" | "inProgress" | "resolved" | "closed";

const TABS: FilterTab<TicketTab>[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "inProgress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const SEARCH_PATHS = ["subject", "message", "category", "userId.name", "userId.email"];

export default function SupportPage() {
  const [tab, setTab] = useState<TicketTab>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useSupportTickets();

  const rows = useMemo(() => {
    const items = data ?? [];
    const scoped = tab === "all" ? items : items.filter((ticket) => ticket.status === tab);
    return filterByPaths(scoped, debouncedSearch, SEARCH_PATHS);
  }, [data, tab, debouncedSearch]);

  const columns: Column<SupportTicket>[] = [
    {
      key: "subject",
      header: "Ticket",
      render: (ticket) => (
        <div className="min-w-0 max-w-md">
          <Link
            href={`/admin/support/${idOf(ticket)}`}
            className="block truncate font-medium text-navy hover:text-sky hover:underline"
          >
            {ticket.subject || "Support ticket"}
          </Link>
          <p className="truncate text-xs text-muted">{ticket.message || "—"}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      secondary: true,
      render: (ticket) => <span className="capitalize">{ticket.category || "—"}</span>,
    },
    {
      key: "user",
      header: "Raised by",
      secondary: true,
      render: (ticket) => refLabel(ticket.userId),
    },
    {
      key: "created",
      header: "Created",
      secondary: true,
      render: (ticket) => (
        <span className="text-xs text-muted">{formatDate(ticket.createdAt)}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (ticket) => <StatusBadge status={ticket.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (ticket) => (
        <Link href={`/admin/support/${idOf(ticket)}`}>
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
        title="Support"
        description="Help requests raised by travellers and providers."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(ticket, index) => idOf(ticket) || `ticket-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={LifeBuoy}
        emptyTitle="No tickets found"
        emptyDescription="Support requests will appear here as they are submitted."
        caption={`${rows.length} ticket${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
