import { WebsiteExplore } from "@/components/site/explore/website-explore";
import { getRecommendedTrips } from "@/services/customer/trip.service";
import { getPopularHotels } from "@/services/customer/hotel.service";
import { getDiscoveryListings } from "@/services/customer/discovery.service";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Explore northern valleys",
  description:
    "Explore Hunza, Skardu, Fairy Meadows, Swat and the Karakoram with local transport, stays, guides and tours.",
};
export default async function ExplorePage() {
  const [trips, hotels, guides, tours] = await Promise.allSettled([
    getRecommendedTrips(100),
    getPopularHotels(100),
    getDiscoveryListings("guides"),
    getDiscoveryListings("tours"),
  ]);
  return (
    <WebsiteExplore
      initialTrips={trips.status === "fulfilled" ? trips.value : undefined}
      initialHotels={hotels.status === "fulfilled" ? hotels.value : undefined}
      initialGuides={guides.status === "fulfilled" ? guides.value : undefined}
      initialTours={tours.status === "fulfilled" ? tours.value : undefined}
    />
  );
}
