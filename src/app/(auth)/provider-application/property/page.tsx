import type { Metadata } from "next";
import { LodgingProperty } from "@/components/auth/lodging-property";

export const metadata: Metadata = { title: "Property details" };

export default function LodgingPropertyPage() {
  return <LodgingProperty />;
}
