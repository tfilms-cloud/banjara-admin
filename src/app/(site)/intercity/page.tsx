import type { Metadata } from "next";
import { IntercityRequest } from "@/components/site/intercity/intercity-request";

export const metadata: Metadata = {
  title: "City to City rides",
  description: "Door-to-door rides between the cities of northern Pakistan. Choose your pickup and drop-off, see the fare, and get offers from drivers.",
};

export default function IntercityPage() {
  return <IntercityRequest />;
}
