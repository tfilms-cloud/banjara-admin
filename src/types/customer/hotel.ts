export type HotelType =
  "hotel" | "resort" | "guest_house" | "lodge" | "homestay";

export type HotelLocation = {
  city: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type HotelRoom = {
  id: string;
  hotelId: string;
  name: string;
  images: string[];
  bedType: string;
  capacity: number;
  sizeSqm: number;
  amenities: string[];
  breakfastIncluded: boolean;
  freeCancellation: boolean;
  pricePerNight: number;
  availableRooms: number;
  description: string;
  roomType?: string;
  cancellationPolicy?: string;
  status?: string;
};

export type Hotel = {
  id: string;
  providerId?: string;
  managerName?: string;
  yearsExperience?: number;
  restaurantAvailable?: boolean;
  businessRegistered?: boolean;
  website?: string;
  status?: string;
  approvalStatus?: string;
  name: string;
  description: string;
  images: string[];
  location: HotelLocation;
  rating: number;
  reviewCount: number;
  hotelType: HotelType;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  priceFrom: number;
  featured?: boolean;
  popular?: boolean;
  isVerified?: boolean;
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
  phone: string;
  email: string;
};

export type HotelStay = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};
export type HotelQuoteInput = {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
};
export type HotelQuote = {
  subtotal: number;
  nights: number;
  pricePerNight: number;
  nightlyRates: { date: string; rate: number }[];
};
export type HotelReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  providerReply?: string;
};

export type HotelSearchParams = {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  query?: string;
};
