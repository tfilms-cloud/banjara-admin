"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/lib/utils";
import { getAuditLog, type AuditEntry } from "@/services/auth.service";

/** Plain-language names for the auth events; admin API changes show their route. */
const EVENT_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.login.failed": "Failed sign-in",
  "auth.locked": "Account locked (too many failed sign-ins)",
  "auth.2fa.enabled": "Turned on 2-step verification",
  "auth.2fa.disabled": "Turned off 2-step verification",
};

function adminName(entry: AuditEntry) {
  const admin = entry.adminId;
  if (admin && typeof admin === "object") return admin.name || admin.email || "Admin";
  return "Admin";
}

function describe(entry: AuditEntry) {
  return EVENT_LABELS[entry.action] ?? entry.action;
}

function details(entry: AuditEntry) {
  const meta = entry.meta ?? {};
  const parts: string[] = [];
  if (typeof meta.reason === "string") parts.push(meta.reason === "password" ? "wrong password" : "wrong code");
  if (meta.body && typeof meta.body === "object") {
    for (const [key, value] of Object.entries(meta.body)) parts.push(`${key}: ${String(value)}`);
  }
  if (typeof meta.ip === "string") parts.push(meta.ip);
  return parts.join(" · ") || "—";
}

const COLUMNS: Column<AuditEntry>[] = [
  { key: "when", header: "When", render: (row) => formatDateTime(row.createdAt), className: "whitespace-nowrap" },
  { key: "who", header: "Admin", render: (row) => adminName(row) },
  {
    key: "what",
    header: "Action",
    render: (row) => (
      <span className={row.action === "auth.login.failed" || row.action === "auth.locked" ? "text-danger" : undefined}>
        {describe(row)}
      </span>
    ),
  },
  {
    key: "target",
    header: "Record",
    secondary: true,
    render: (row) => (row.entityId ? `${row.entityType} · ${row.entityId.slice(-6)}` : row.entityType),
  },
  { key: "details", header: "Details", secondary: true, render: (row) => details(row) },
];

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const log = useQuery({ queryKey: ["admin", "audit-log"], queryFn: () => getAuditLog(300) });

  const rows = useMemo(() => {
    const all = log.data ?? [];
    const q = debounced.trim().toLowerCase();
    if (!q) return all;
    return all.filter((entry) =>
      [describe(entry), adminName(entry), entry.entityType, details(entry)].join(" ").toLowerCase().includes(q)
    );
  }, [log.data, debounced]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every change made in the admin portal, and every admin sign-in. Newest first."
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Search actions, admins, records…" />
      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row._id}
        loading={log.isPending}
        error={log.error}
        onRetry={() => void log.refetch()}
        emptyIcon={ScrollText}
        emptyTitle="Nothing recorded yet"
        emptyDescription="Admin sign-ins and changes will appear here."
      />
    </div>
  );
}
