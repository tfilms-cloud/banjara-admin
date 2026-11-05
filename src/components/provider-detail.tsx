"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Bus,
  Compass,
  Globe,
  Hotel,
  MapPin,
  Phone,
  Star,
  User,
} from "lucide-react";
import { ErrorState } from "@/components/error-state";
import { DetailSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/page-header";
import { ProviderActions } from "@/components/provider-actions";
import { DetailGrid, DetailRow } from "@/components/record-details";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProvider } from "@/hooks/useProvider";
import { providerServiceLabels } from "@/lib/provider-labels";
import { refLabel } from "@/lib/records";
import { formatDateTime } from "@/lib/utils";

export type ProviderDetailProps = {
  id: string;
  backHref: string;
  backLabel: string;
};

function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDetailValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    const items = value.map(String).filter((item) => item && item !== "images");
    const visible = items.filter((item) => !item.startsWith("http"));
    return visible.length ? visible.join(", ") : null;
  }
  if (typeof value === "object") return null;
  return String(value);
}

function ApplicationSection({
  title,
  icon: Icon,
  details,
}: {
  title: string;
  icon: typeof Building2;
  details?: Record<string, unknown> | null;
}) {
  if (!details) return null;
  const rows = Object.entries(details)
    .filter(([key]) => key !== "_id" && key !== "id" && key !== "images")
    .map(([key, value]) => [labelize(key), formatDetailValue(value)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  const images = Array.isArray(details.images)
    ? details.images.filter((item): item is string => typeof item === "string" && Boolean(item))
    : [];
  if (!rows.length && !images.length) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Icon className="h-4 w-4 text-sky" aria-hidden />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <DetailGrid>
            {rows.map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </DetailGrid>
        ) : null}
        {images.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.slice(0, 8).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="h-24 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProviderDetail({ id, backHref, backLabel }: ProviderDetailProps) {
  const { data: provider, isPending, isError, error, refetch, isFetching } = useProvider(id);

  if (isPending) {
    return (
      <div className="space-y-5">
        <PageHeader title="Provider" description="Loading application details…" />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="space-y-5">
        <PageHeader title="Provider" />
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <ErrorState
            title="Could not load this provider"
            error={error}
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </div>
    );
  }

  const services = providerServiceLabels(provider);
  const account = provider.userId;

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <PageHeader
        title={provider.businessName || "Provider"}
        description={
          [provider.ownerName, provider.city].filter(Boolean).join(" · ") || undefined
        }
        actions={<ProviderActions provider={provider} size="md" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={provider.verificationStatus} />
        {services.map((service) => (
          <span
            key={service}
            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted"
          >
            {service}
          </span>
        ))}
      </div>

      {provider.rejectionReason ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
          <p className="text-sm font-medium text-danger">Reason on record</p>
          <p className="mt-1 text-sm text-foreground">{provider.rejectionReason}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Building2 className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Business name" value={provider.businessName || "—"} />
              <DetailRow label="Owner" value={provider.ownerName || "—"} />
              <DetailRow
                label="Years of experience"
                value={provider.yearsExperience ?? "—"}
              />
              <DetailRow
                label="Rating"
                value={
                  provider.rating !== undefined ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber" aria-hidden />
                      {provider.rating.toFixed(1)}
                      <span className="text-muted">
                        ({provider.totalReviews ?? 0} reviews)
                      </span>
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailGrid>
            {provider.description ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Description
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {provider.description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Phone className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow
                label="Email"
                value={
                  provider.email ? (
                    <a className="text-sky hover:underline" href={`mailto:${provider.email}`}>
                      {provider.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Phone"
                value={
                  provider.phone ? (
                    <a className="text-sky hover:underline" href={`tel:${provider.phone}`}>
                      {provider.phone}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Website"
                value={
                  provider.website ? (
                    <a
                      className="inline-flex items-center gap-1 text-sky hover:underline"
                      href={provider.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      {provider.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                label="Address"
                value={
                  <span className="inline-flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                    {[
                      provider.structuredAddress?.formattedAddress || provider.address,
                      provider.city,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                }
              />
              <DetailRow
                label="Map pin"
                value={
                  Array.isArray(provider.location?.coordinates) &&
                  provider.location.coordinates.length === 2
                    ? `${provider.location.coordinates[1]}, ${provider.location.coordinates[0]}`
                    : "—"
                }
              />
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <User className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Linked account</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Account" value={refLabel(account)} />
              <DetailRow
                label="Account email"
                value={
                  typeof account === "object" && account?.email ? account.email : "—"
                }
              />
              <DetailRow
                label="Account phone"
                value={
                  typeof account === "object" && account?.phone ? account.phone : "—"
                }
              />
            </DetailGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-sky" aria-hidden />
            <CardTitle>Application timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailGrid>
              <DetailRow label="Submitted" value={formatDateTime(provider.createdAt)} />
              <DetailRow label="Last updated" value={formatDateTime(provider.updatedAt)} />
              <DetailRow
                label="Verification status"
                value={<StatusBadge status={provider.verificationStatus} />}
              />
            </DetailGrid>
          </CardContent>
        </Card>
      </div>

      <ApplicationSection title="Transport details" icon={Bus} details={provider.transportDetails} />
      <ApplicationSection title="Hotel details" icon={Hotel} details={provider.hotelDetails} />
      <ApplicationSection title="Tour / guide details" icon={Compass} details={provider.tourDetails} />

      <div>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} loading={isFetching}>
          Refresh details
        </Button>
      </div>
    </div>
  );
}
