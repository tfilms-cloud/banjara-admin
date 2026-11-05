import type { PickupPoint, TripWithDetails } from "./trip";

export type AgencyTrip = TripWithDetails & { dropoffLocations: PickupPoint[] };
export type AgencyVehicle = {
  id: string;
  name: string;
  kind: string;
  plate: string;
  capacity?: number;
  photos: string[];
  amenities: string[];
};
export type TransportAgency = {
  id: string;
  userId: string;
  name: string;
  description: string;
  logo: string;
  phone: string;
  city: string;
  address: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  yearsExperience?: number;
  operatingCities: string[];
  operatingRoutes: string[];
  pickups: string[];
  dropoffs: string[];
  fleet: AgencyVehicle[];
  driver?: { name: string; experience: string; photo: string };
};
export type AgencyReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply: string;
};
