import type { Metadata } from "next";
import { LodgingPhotos } from "@/components/auth/lodging-photos";

export const metadata: Metadata = { title: "Photos" };

export default function LodgingPhotosPage() {
  return <LodgingPhotos />;
}
