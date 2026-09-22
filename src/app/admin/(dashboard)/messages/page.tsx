"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMessages } from "@/hooks/useNotifications";
import { filterByPaths, firstText, refLabel } from "@/lib/records";
import { formatDateTime, idOf } from "@/lib/utils";

const SEARCH_PATHS = [
  "subject",
  "message",
  "content",
  "text",
  "senderId.name",
  "receiverId.name",
];

export default function MessagesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useMessages();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, SEARCH_PATHS),
    [data, debouncedSearch]
  );

  const columns: Column<unknown>[] = [
    {
      key: "from",
      header: "From",
      render: (message) =>
        refLabel(
          (message as Record<string, unknown>)?.senderId ??
            (message as Record<string, unknown>)?.from
        ),
    },
    {
      key: "to",
      header: "To",
      secondary: true,
      render: (message) =>
        refLabel(
          (message as Record<string, unknown>)?.receiverId ??
            (message as Record<string, unknown>)?.to
        ),
    },
    {
      key: "message",
      header: "Message",
      render: (message) => (
        <div className="min-w-0 max-w-lg">
          <p className="truncate text-sm font-medium text-navy">
            {firstText(message, ["subject", "title"], "Message")}
          </p>
          <p className="line-clamp-2 text-sm text-muted">
            {firstText(message, ["message", "content", "text", "body"])}
          </p>
        </div>
      ),
    },
    {
      key: "sent",
      header: "Sent",
      secondary: true,
      render: (message) => (
        <span className="text-xs text-muted">
          {formatDateTime(firstText(message, ["createdAt", "sentAt"], ""))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (message) => {
        const status = firstText(message, ["status"], "");
        if (status && status !== "—") return <StatusBadge status={status} />;
        const isRead = (message as Record<string, unknown>)?.isRead;
        if (typeof isRead === "boolean") {
          return <StatusBadge status={isRead ? "resolved" : "open"} />;
        }
        return <span>—</span>;
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Messages"
        description="Conversations exchanged between travellers and providers."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search messages…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(message, index) => idOf(message) || `message-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={MessageSquare}
        emptyTitle="No messages"
        emptyDescription="Messages sent through the platform will appear here."
        caption={`${rows.length} message${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
