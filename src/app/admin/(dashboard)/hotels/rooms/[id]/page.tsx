"use client";

import { useParams } from "next/navigation";
import { ResourceDetail } from "@/components/resource-detail";
import { useRoom } from "@/hooks/useRooms";
import { firstText, optionalText } from "@/lib/records";

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data, isPending, isError, error, refetch, isFetching } = useRoom(id);

  return (
    <ResourceDetail
      backHref="/admin/hotels/rooms"
      backLabel="Back to rooms"
      title={firstText(data, ["name", "roomType", "type", "roomNumber"], "Room")}
      description={optionalText(data, ["hotelId.name", "roomType", "type"])}
      record={data}
      loading={isPending}
      error={isError ? error : undefined}
      refetching={isFetching}
      onRetry={() => void refetch()}
      detailsTitle="Room details"
    />
  );
}
