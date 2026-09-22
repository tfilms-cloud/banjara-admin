"use client";

import { useParams } from "next/navigation";
import { ProviderDetail } from "@/components/provider-detail";

export default function ProviderApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  return (
    <ProviderDetail
      id={id}
      backHref="/admin/providers/applications"
      backLabel="Back to applications"
    />
  );
}
