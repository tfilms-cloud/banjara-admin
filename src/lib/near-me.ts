/**
 * "Rides near me": the visitor's position and search radius, carried in the map URL as
 * `near=lat,lng&radius=km`. GET /api/discover applies the same parameters on the server.
 */
export const NEAR_DEFAULT_KM = 10;
export const NEAR_MAX_KM = 20;

export type NearMe = { lat: number; lng: number; radiusKm: number };

export function readNearMe(params: URLSearchParams): NearMe | null {
  const parts = (params.get("near") ?? "").split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const radius = Number(params.get("radius"));
  const radiusKm = Number.isFinite(radius) && radius > 0
    ? Math.min(NEAR_MAX_KM, Math.max(1, Math.round(radius)))
    : NEAR_DEFAULT_KM;
  return { lat, lng, radiusKm };
}

/** Where the "Ride" choice sends the visitor once their location is known. */
export function nearMeHref(lat: number, lng: number, radiusKm = NEAR_DEFAULT_KM) {
  const params = new URLSearchParams({
    service: "transport",
    near: `${lat.toFixed(5)},${lng.toFixed(5)}`,
    radius: String(radiusKm),
  });
  return `/explore/map?${params}`;
}

/** A box around the search circle, [[south, west], [north, east]], for fitting the map. */
export function nearBounds(near: NearMe): [[number, number], [number, number]] {
  const dLat = near.radiusKm / 111.32;
  const dLng = near.radiusKm / (111.32 * Math.max(0.2, Math.cos((near.lat * Math.PI) / 180)));
  return [
    [near.lat - dLat, near.lng - dLng],
    [near.lat + dLat, near.lng + dLng],
  ];
}

export type LocateFailure = "denied" | "unavailable" | "timeout";

/** Ask the browser for the visitor's position (once; nothing is stored). */
export function locateVisitor(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject("unavailable" satisfies LocateFailure);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(
          (error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable") satisfies LocateFailure,
        ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
