import type { Metadata } from "next";
import { MyRideRequests } from "@/components/site/intercity/intercity-request-status";

export const metadata: Metadata = { title: "My City to City rides" };

export default function AccountIntercityPage() {
  return <MyRideRequests />;
}
