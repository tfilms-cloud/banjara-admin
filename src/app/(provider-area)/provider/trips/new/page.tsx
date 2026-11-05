import type { Metadata } from "next";
import { TripForm } from "@/components/provider-area/trips/trip-form";

export const metadata: Metadata = { title: "Create trip" };

export default function NewTripPage() {
  return <TripForm />;
}
