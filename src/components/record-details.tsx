import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { detailFields, isIsoLike } from "@/lib/records";
import { cn, formatDateTime } from "@/lib/utils";

export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 py-2", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-1 sm:grid-cols-2", className)}>{children}</dl>
  );
}

/**
 * Renders every primitive field returned by the API. Used for resources whose
 * shape is defined by the backend rather than a typed contract.
 */
export function RecordDetails({
  record,
  title = "Record details",
  skip = [],
}: {
  record: unknown;
  title?: string;
  skip?: string[];
}) {
  const fields = detailFields(record, skip);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fields.length ? (
          <DetailGrid>
            {fields.map((field) => (
              <DetailRow
                key={field.key}
                label={field.label}
                value={isIsoLike(field.value) ? formatDateTime(field.value) : field.value}
              />
            ))}
          </DetailGrid>
        ) : (
          <EmptyState
            title="No details returned"
            description="The API did not return any additional fields for this record."
          />
        )}
      </CardContent>
    </Card>
  );
}
