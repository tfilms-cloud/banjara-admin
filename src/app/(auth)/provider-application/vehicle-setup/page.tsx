import type { Metadata } from "next";
import { DriverVehicleSetup } from "@/components/auth/driver-vehicle-setup";

export const metadata: Metadata = { title: "Vehicle setup" };

export default function DriverVehicleSetupPage() {
  return <DriverVehicleSetup />;
}
