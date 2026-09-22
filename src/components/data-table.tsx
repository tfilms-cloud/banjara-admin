"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hidden below the `md` breakpoint to keep the table readable on phones. */
  secondary?: boolean;
  align?: "left" | "right" | "center";
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  className?: string;
  caption?: ReactNode;
};

const ALIGN: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  className,
  caption,
}: DataTableProps<T>) {
  const shell = "overflow-hidden rounded-xl border border-border bg-card shadow-sm";

  if (loading) {
    return (
      <div className={cn(shell, className)}>
        <TableSkeleton columns={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(shell, className)}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={cn(shell, className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={cn(shell, className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted",
                    ALIGN[column.align ?? "left"],
                    column.secondary ? "hidden md:table-cell" : undefined,
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-sky/5" : "hover:bg-slate-50/70"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 align-middle text-foreground",
                      ALIGN[column.align ?? "left"],
                      column.secondary ? "hidden md:table-cell" : undefined,
                      column.className
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <div className="border-t border-border px-4 py-3 text-xs text-muted">{caption}</div>
      ) : null}
    </div>
  );
}
