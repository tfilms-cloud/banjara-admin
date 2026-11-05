import type { Metadata } from "next";
import { DriverLocation } from "@/components/auth/driver-location";

export const metadata: Metadata = { title: "Your location" };

export default function DriverLocationPage() {
  return <DriverLocation />;
}
