/**
 * Map tiles. The free OpenStreetMap server is fine for development, but its usage policy does
 * not allow production traffic — point NEXT_PUBLIC_MAP_TILE_URL at a keyed provider (MapTiler,
 * Stadia, …) before launch and set NEXT_PUBLIC_MAP_ATTRIBUTION to that provider's required text.
 */
export const MAP_TILES = {
  url:
    process.env.NEXT_PUBLIC_MAP_TILE_URL ??
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

/** Gilgit-Baltistan / Khyber Pakhtunkhwa — where almost every listing is. */
export const DEFAULT_CENTER: [number, number] = [35.6, 74.8];
export const DEFAULT_ZOOM = 6;

/** Compact price for a pin bubble: 6500 -> "6.5k". */
export function pinPrice(price: number | null | undefined): string {
  if (!price || price <= 0) return "";
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (price >= 1000) return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`;
  return String(Math.round(price));
}

/** Link that opens turn-by-turn directions in the user's map app. */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
