import type { Metadata } from "next";
import { DriverReview } from "@/components/auth/driver-review";

export const metadata: Metadata = { title: "Review & submit" };

export default function DriverReviewPage() {
  return <DriverReview />;
}
