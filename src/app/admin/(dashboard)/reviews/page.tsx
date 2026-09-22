"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useReviews } from "@/hooks/useReviews";
import { filterByPaths, refLabel } from "@/lib/records";
import { formatDate, idOf } from "@/lib/utils";
import type { ReviewRecord } from "@/types/admin";

const SEARCH_PATHS = [
  "comment",
  "reply",
  "providerId.businessName",
  "customerId.name",
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={index < Math.round(rating) ? "h-3.5 w-3.5 text-amber" : "h-3.5 w-3.5 text-slate-300"}
          aria-hidden
        />
      ))}
      <span className="ml-1 text-xs text-muted">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isError, error, refetch, isFetching } = useReviews();

  const reviews = useMemo(() => data ?? [], [data]);
  const rows = useMemo(
    () => filterByPaths(reviews, debouncedSearch, SEARCH_PATHS),
    [reviews, debouncedSearch]
  );

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0);
    return total / reviews.length;
  }, [reviews]);

  const columns: Column<ReviewRecord>[] = [
    {
      key: "rating",
      header: "Rating",
      render: (review) => <Stars rating={review.rating ?? 0} />,
    },
    {
      key: "provider",
      header: "Provider",
      render: (review) => refLabel(review.providerId),
    },
    {
      key: "customer",
      header: "Customer",
      secondary: true,
      render: (review) => refLabel(review.customerId),
    },
    {
      key: "comment",
      header: "Comment",
      render: (review) => (
        <p className="line-clamp-2 max-w-md text-sm text-foreground">{review.comment || "—"}</p>
      ),
    },
    {
      key: "reply",
      header: "Provider reply",
      secondary: true,
      render: (review) => (
        <p className="line-clamp-2 max-w-xs text-sm text-muted">{review.reply || "—"}</p>
      ),
    },
    {
      key: "date",
      header: "Posted",
      secondary: true,
      render: (review) => (
        <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reviews"
        description="Feedback travellers left for BANJARA providers."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
            Refresh
          </Button>
        }
      />

      {!isPending && !isError && reviews.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Total reviews" value={reviews.length} icon={Star} tone="navy" />
          <StatCard label="Average rating" value={average.toFixed(2)} icon={Star} tone="amber" />
        </div>
      ) : null}

      <SearchInput value={search} onChange={setSearch} placeholder="Search reviews…" />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(review, index) => idOf(review) || `review-${index}`}
        loading={isPending}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        emptyIcon={Star}
        emptyTitle="No reviews yet"
        emptyDescription="Reviews left by travellers will appear here."
        caption={`${rows.length} review${rows.length === 1 ? "" : "s"}`}
      />
    </div>
  );
}
