import type { Metadata } from "next";
import { LodgingRooms } from "@/components/auth/lodging-rooms";

export const metadata: Metadata = { title: "Your rooms" };

export default function LodgingRoomsPage() {
  return <LodgingRooms />;
}
