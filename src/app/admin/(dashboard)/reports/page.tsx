"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartColumn } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FilterTabs, type FilterTab } from "@/components/filter-tabs";
import { CardsSkeleton, Skeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReports } from "@/hooks/useReports";
import { displayValue, toRecord, toTitleCase } from "@/lib/records";

type Range = "7d" | "30d" | "90d" | "1y";

const RANGES: FilterTab<Range>[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "12 months" },
];

const CHART_COLOURS = ["#3b82f6", "#f59e0b", "#16a34a", "#0b1f33", "#dc2626"];

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))
  );
}

function SeriesCard({ name, rows }: { name: string; rows: Record<string, unknown>[] }) {
  const keys = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
    return Array.from(set).slice(0, 6);
  }, [rows]);

  const labelKey = keys.find((key) => /date|day|month|label|name|_id/i.test(key));
  const numericKeys = keys.filter(
    (key) => key !== labelKey && rows.some((row) => typeof row[key] === "number")
  );

  const columns: Column<Record<string, unknown>>[] = keys.map((key, index) => ({
    key,
    header: toTitleCase(key),
    secondary: index > 2,
    align: rows.some((row) => typeof row[key] === "number") ? "right" : "left",
    render: (row) => displayValue(row[key]),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{toTitleCase(name)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {labelKey && numericKeys.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey={labelKey}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                {numericKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={toTitleCase(key)}
                    stroke={CHART_COLOURS[index % CHART_COLOURS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(_, index) => `${name}-${index}`}
          emptyTitle="No rows"
          emptyDescription="This report section returned no rows."
        />
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isPending, isError, error, refetch, isFetching } = useReports(range);

  const entries = useMemo(() => Object.entries(toRecord(data)), [data]);
  const metrics = entries.filter(
    ([, value]) => typeof value === "number" || typeof value === "boolean"
  );
  const series = entries.filter(([, value]) => isObjectArray(value)) as [
    string,
    Record<string, unknown>[],
  ][];
  const nested = entries.filter(
    ([, value]) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(toRecord(value)).length > 0
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Platform performance reported by the BANJARA analytics endpoint."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      <FilterTabs tabs={RANGES} value={range} onChange={setRange} />

      {isPending ? (
        <div className="space-y-4">
          <CardsSkeleton count={4} />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={ChartColumn}
            title="No report data"
            description="The reports endpoint returned no data for the selected range."
          />
        </div>
      ) : (
        <div className="space-y-5">
          {metrics.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(([key, value]) => (
                <StatCard
                  key={key}
                  label={toTitleCase(key)}
                  value={displayValue(value)}
                  tone="navy"
                />
              ))}
            </div>
          ) : null}

          {series.map(([key, rows]) => (
            <SeriesCard key={key} name={key} rows={rows} />
          ))}

          {nested.map(([key, value]) => {
            const fields = Object.entries(toRecord(value));
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{toTitleCase(key)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map(([fieldKey, fieldValue]) => (
                      <div key={fieldKey} className="flex flex-col gap-0.5">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                          {toTitleCase(fieldKey)}
                        </dt>
                        <dd className="text-sm text-foreground">{displayValue(fieldValue)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
