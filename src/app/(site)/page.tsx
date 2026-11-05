import { WebsiteHome } from "@/components/site/home/website-home";
import { getPopularHotels } from "@/services/customer/hotel.service";
import { getRecommendedTrips } from "@/services/customer/trip.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trips, hotels] = await Promise.allSettled([
    getRecommendedTrips(100),
    getPopularHotels(12),
  ]);
  return (
    <WebsiteHome
      initialTrips={trips.status === "fulfilled" ? trips.value : undefined}
      initialHotels={hotels.status === "fulfilled" ? hotels.value : undefined}
    />
  );
}
