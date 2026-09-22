"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { RecordDetails } from "@/components/record-details";
import { Button } from "@/components/ui/button";

export type ResourceDetailProps = {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  record: unknown;
  loading: boolean;
  error?: unknown;
  refetching?: boolean;
  onRetry: () => void;
  detailsTitle?: string;
  skipFields?: string[];
  children?: ReactNode;
};

export function ResourceDetail({
  backHref,
  backLabel,
  title,
  description,
  record,
  loading,
  error,
  refetching = false,
  onRetry,
  detailsTitle = "Record details",
  skipFields,
  children,
}: ResourceDetailProps) {
  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} description="Loading details…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (error || record === null || record === undefined) {
    return (
      <div className="space-y-5">
        <PageHeader title={title} />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this record"
            error={error}
            onRetry={onRetry}
            retrying={refetching}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <PageHeader title={title} description={description} />

      {children}

      <RecordDetails record={record} title={detailsTitle} skip={skipFields} />

      <Button variant="ghost" size="sm" onClick={onRetry} loading={refetching}>
        Refresh details
      </Button>
    </div>
  );
}
