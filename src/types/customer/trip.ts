export type VehicleType = "van" | "bus" | "car" | "tour" | "private";

export type Agency = {
  id: string;
  userId?: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  phone: string;
  email: string;
  description: string;
  verified?: boolean;
  city?: string;
};

export type PickupPoint = {
  id: string;
  name: string;
  address?: string;
  tripId?: string;
  description?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
};

export type Trip = {
  id: string;
  agencyId: string;
  vehicleId: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  date: string;
  price: number;
  currency: string;
  availableSeats: number;
  totalSeats: number;
  rating: number;
  amenities: string[];
  image: string;
  popular?: boolean;
  recommended?: boolean;
  journeyType?: "one_way" | "round_trip";
  returnDate?: string;
  description?: string;
  status?: string;
};

export type TripWithDetails = Trip & {
  agency: Agency;
  vehicleType: VehicleType;
  vehicleName: string;
  vehicleClass?: string;
  vehicleCategory?: string;
  bookingMode?: "seat" | "vehicle";
  vehicleBrand?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleCapacity?: number;
  vehicleImages?: string[];
  pickupLocations: PickupPoint[];
  dropoffLocations?: PickupPoint[];
  arrivalDate?: string;
  returnTime?: string;
  vehicleYear?: number;
  seatLayout?: { seatNumber: string; status: string }[];
  stops?: { name: string; description?: string; time?: string }[];
};

export type TripSearchParams = {
  from: string;
  to: string;
  date: string;
  passengers: number;
  journeyType?: "one_way" | "round_trip";
  query?: string;
};

export type TripSortBy =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "departure"
  | "rating"
  | "duration";
