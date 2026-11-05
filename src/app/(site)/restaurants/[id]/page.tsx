import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerApiError } from "@/lib/customer-api";
import { pakistanDate } from "@/lib/home-discovery";
import { getRestaurantById } from "@/services/customer/restaurant.service";
import { WebsiteRestaurantDetails } from "@/components/site/restaurants/website-restaurant-details";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const restaurant = await getRestaurantById((await params).id);
    return { title: restaurant.name, description: restaurant.description };
  } catch {
    return { title: "Restaurant details" };
  }
}
export default async function RestaurantDetailsPage({ params }: Props) {
  const { id } = await params;
  let restaurant;
  try {
    restaurant = await getRestaurantById(id);
  } catch (error) {
    if (
      (error instanceof CustomerApiError && error.status === 404) ||
      (error instanceof Error &&
        /\(404\)|no longer available/.test(error.message))
    )
      notFound();
  }
  return (
    <WebsiteRestaurantDetails
      key={id}
      id={id}
      initialRestaurant={restaurant}
      today={pakistanDate()}
    />
  );
}
