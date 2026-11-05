import { Suspense } from "react";
import type { Metadata } from "next";
import { ExploreMapPage } from "@/components/site/map/explore-map-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Explore on the map",
  description:
    "See rides, stays, tours, guides and restaurants across northern Pakistan on a map, with the same filters as Explore.",
};

export default function ExploreMapRoute() {
  return (
    <Suspense fallback={null}>
      <ExploreMapPage />
    </Suspense>
  );
}
