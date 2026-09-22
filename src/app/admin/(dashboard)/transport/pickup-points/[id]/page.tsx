"use client";

import { useParams } from "next/navigation";
import { ResourceDetail } from "@/components/resource-detail";
import { usePickupPoint } from "@/hooks/useRoutes";
import { firstText, optionalText } from "@/lib/records";

export default function PickupPointDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = usePickupPoint(id);

  return (
    <ResourceDetail
      backHref="/admin/transport/pickup-points"
      backLabel="Back to pickup points"
      title={firstText(data, ["name", "title"], "Pickup point")}
      description={optionalText(data, ["address", "city", "landmark"])}
      record={data}
      loading={isPending}
      error={isError ? error : undefined}
      refetching={isFetching}
      onRetry={() => void refetch()}
      detailsTitle="Pickup point details"
    />
  );
}
