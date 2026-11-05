import type { Metadata } from "next";
import { DriverVehicle } from "@/components/auth/driver-vehicle";

export const metadata: Metadata = { title: "You & your vehicle" };

export default function DriverVehiclePage() {
  return <DriverVehicle />;
}
