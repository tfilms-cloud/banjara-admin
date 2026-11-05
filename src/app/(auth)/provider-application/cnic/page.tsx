import type { Metadata } from "next";
import { DriverCnic } from "@/components/auth/driver-cnic";

export const metadata: Metadata = { title: "Verify your CNIC" };

export default function DriverCnicPage() {
  return <DriverCnic />;
}
