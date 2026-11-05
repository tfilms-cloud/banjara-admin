export type RestaurantDetails = {
  id: string;
  userId: string;
  name: string;
  city: string;
  address: string;
  description: string;
  cuisine: string[];
  menu: string[];
  images: string[];
  hours: string;
  phone: string;
  website: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  offers: {
    id: string;
    title: string;
    description: string;
    discountPercent?: number;
  }[];
};

export type DiningPlan = {
  date: string;
  time: string;
  guests: number;
  seating: "any" | "indoor" | "outdoor";
  interests: string[];
  notes: string;
};
