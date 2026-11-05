import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProviderSection } from "@/components/provider-area/provider-section";
import { PROVIDER_SECTIONS } from "@/lib/provider-sections";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: PROVIDER_SECTIONS[section]?.title ?? "Provider" };
}

export default async function ProviderSectionPage({ params }: Props) {
  const { section } = await params;
  if (!PROVIDER_SECTIONS[section]) notFound();
  return <ProviderSection section={section} />;
}
