"use client";

import { useParams } from "next/navigation";
import { ProviderDetail } from "@/components/provider-detail";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  return <ProviderDetail id={id} backHref="/admin/providers" backLabel="Back to providers" />;
}
