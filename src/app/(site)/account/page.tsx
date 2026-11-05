import type { Metadata } from "next";
import { WebsiteProfile } from "@/components/site/profile/website-profile";
export const metadata: Metadata = {
  title: "Profile & Account",
  description: "Manage your BANJARA profile, bookings and travel preferences.",
};
export default function AccountPage() {
  return <WebsiteProfile />;
}
