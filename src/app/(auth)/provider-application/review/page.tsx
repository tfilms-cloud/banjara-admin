import type { Metadata } from "next";
import { ApplicationReview } from "@/components/auth/application-review";

export const metadata: Metadata = { title: "Review & submit" };

export default function ReviewPage() {
  return <ApplicationReview />;
}
