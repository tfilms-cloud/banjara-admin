import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerApiError } from "@/lib/customer-api";
import { pakistanDate } from "@/lib/home-discovery";
import { readTourPlan } from "@/lib/tour-details";
import {
  getPublishedTour,
  getTourOperator,
} from "@/services/customer/tour.service";
import { WebsiteTourDetails } from "@/components/site/tours/website-tour-details";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const tour = await getPublishedTour((await params).id);
    return { title: tour.title, description: tour.summary };
  } catch {
    return { title: "Tour details" };
  }
}
export default async function TourDetailsPage({ params, searchParams }: Props) {
  const { id } = await params;
  let tour;
  try {
    tour = await getPublishedTour(id);
  } catch (error) {
    if (
      (error instanceof CustomerApiError && error.status === 404) ||
      (error instanceof Error && /\(404\)/.test(error.message))
    )
      notFound();
  }
  const operator = tour?.providerId
    ? await getTourOperator(tour.providerId).catch(() => undefined)
    : undefined;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (value !== undefined)
      query.set(key, Array.isArray(value) ? value[0] : value);
  const today = pakistanDate();
  return (
    <WebsiteTourDetails
      key={id}
      id={id}
      initialTour={tour}
      initialOperator={operator}
      initialPlan={
        tour
          ? readTourPlan(query, tour, today)
          : { startDate: today, travelers: 1 }
      }
      today={today}
    />
  );
}
