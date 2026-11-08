import { customerGet } from "@/lib/customer-api";

export type DrivingRoute = {
  distanceKm: number;
  durationMin: number;
  /** [lat, lng] points along the road. */
  path: Array<[number, number]>;
};

/** Road distance, drive time and route from A to B. Null when routing is unavailable. */
export const getDrivingRoute = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
  customerGet<DrivingRoute | null>("/directions/driving", {
    params: { from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}` },
  });
