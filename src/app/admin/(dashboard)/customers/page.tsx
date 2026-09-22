"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Users } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/hooks/useCustomers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { filterByPaths } from "@/lib/records";
import { formatDate, idOf } from "@/lib/utils";
import type { Customer } from "@/types/admin";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useCustomers();

  const rows = useMemo(
    () => filterByPaths(data ?? [], debouncedSearch, ["name", "email", "phone"]),
    [data, debouncedSearch]
  );

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (customer) => (
        <Link
          href={`/admin/customers/${idOf(customer)}`}
          className="font-medium text-navy hover:text-sky hover:underline"
        >
          {customer.name || "Unnamed customer"}
        </Link>
      ),
    },
    { key: "email", header: "Email", render: (customer) => customer.email || "—" },
    {
      key: "phone",
      header: "Phone",
      secondary: true,
      render: (customer) => customer.phone || "—",
    },
    {
      key: "joined",
      header: "Joined",
      secondary: true,
      render: (customer) => (
        <span className="text-xs text-muted">{formatDate(customer.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (customer) =>
        customer.status ? <StatusBadge status={customer.status} /> : <span>—</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (customer) => (
        <Link href={`/admin/customers/${idOf(customer)}`}>
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
        title="Customers"
        description="Travellers registered on the BANJARA platform."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(customer, index) => idOf(customer) || `customer-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Users}
        emptyTitle="No customers yet"
        emptyDescription="Traveller accounts will be listed here once people sign up."
        caption={`${rows.length} customer${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
