"use client";

import { useParams } from "next/navigation";
import { ResourceDetail } from "@/components/resource-detail";
import { useRoute } from "@/hooks/useRoutes";
import { firstText, optionalText } from "@/lib/records";

export default function RouteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = useRoute(id);

  const origin = optionalText(data, ["origin", "originCity", "from"]);
  const destination = optionalText(data, ["destination", "destinationCity", "to"]);

  return (
    <ResourceDetail
      backHref="/admin/transport/routes"
      backLabel="Back to routes"
      title={firstText(data, ["name", "routeName"], "Route")}
      description={
        origin && destination ? `${origin} → ${destination}` : origin ?? destination
      }
      record={data}
      loading={isPending}
      error={isError ? error : undefined}
      refetching={isFetching}
      onRetry={() => void refetch()}
      detailsTitle="Route details"
    />
  );
}
