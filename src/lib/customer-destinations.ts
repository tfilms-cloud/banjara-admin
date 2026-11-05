export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=1600&q=80";

export const POPULAR_DESTINATIONS = [
  {
    id: "hunza",
    name: "Hunza",
    subtitle: "Valley of peaks",
    image: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800&q=80",
    tag: "Most loved",
  },
  {
    id: "skardu",
    name: "Skardu",
    subtitle: "Gateway to K2",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    tag: "Adventure",
  },
  {
    id: "gilgit",
    name: "Gilgit",
    subtitle: "Mountain capital",
    image: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80",
    tag: "Culture",
  },
  {
    id: "naran",
    name: "Naran",
    subtitle: "Lake Saiful Muluk",
    image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800&q=80",
    tag: "Lakes",
  },
  {
    id: "swat",
    name: "Swat",
    subtitle: "Green paradise",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
    tag: "Nature",
  },
  {
    id: "murree",
    name: "Murree",
    subtitle: "Hill station",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
    tag: "Weekend",
  },
] as const;

export const ORIGIN_SUGGESTIONS = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Gilgit",
  "Chilas",
] as const;

export function destinationImageFor(place?: string | null): string {
  const key = String(place ?? "")
    .trim()
    .toLowerCase();
  if (!key) return POPULAR_DESTINATIONS[0].image;
  const exact = POPULAR_DESTINATIONS.find((d) => d.name.toLowerCase() === key);
  if (exact) return exact.image;
  const partial = POPULAR_DESTINATIONS.find(
    (d) => key.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(key)
  );
  return partial?.image ?? POPULAR_DESTINATIONS[0].image;
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number, from = todayIsoDate()): string {
  const d = new Date(`${from}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
