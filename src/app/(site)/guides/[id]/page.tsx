import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pakistanDate } from "@/lib/home-discovery";
import { CustomerApiError } from "@/lib/customer-api";
import { getGuideById, getGuideAvailability, getGuideReviews } from "@/services/customer/guide.service";
import { WebsiteGuideDetails } from "@/components/site/guides/website-guide-details";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try { const guide = await getGuideById((await params).id); return { title: guide.name, description: guide.bio || guide.description }; }
  catch { return { title: "Guide details" }; }
}
export default async function GuideDetailsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const [profile, availability, reviews] = await Promise.allSettled([getGuideById(id), getGuideAvailability(id), getGuideReviews(id)]);
  if (profile.status === "rejected") {
    const error = profile.reason;
    if ((error instanceof CustomerApiError && error.status === 404) || (error instanceof Error && /\(404\)|no longer available/.test(error.message))) notFound();
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (value !== undefined) query.set(key, Array.isArray(value) ? value[0] : value);
  return <WebsiteGuideDetails key={id} id={id} today={pakistanDate()} initialQuery={query.toString()} initialGuide={profile.status === "fulfilled" ? profile.value : undefined} initialAvailability={availability.status === "fulfilled" ? availability.value : undefined} initialReviews={reviews.status === "fulfilled" ? reviews.value : undefined} />;
}
