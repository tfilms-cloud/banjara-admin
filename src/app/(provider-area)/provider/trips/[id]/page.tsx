import type { Metadata } from "next";
import { TripForm } from "@/components/provider-area/trips/trip-form";

export const metadata: Metadata = { title: "Edit trip" };

type Props = { params: Promise<{ id: string }> };

export default async function EditTripPage({ params }: Props) {
  const { id } = await params;
  return <TripForm tripId={id} />;
}
