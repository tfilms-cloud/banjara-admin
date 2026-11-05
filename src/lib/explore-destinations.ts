import type { TripWithDetails } from "@/types/customer/trip";

export type ExploreDestination = {
  id: string;
  name: string;
  region: string;
  searchName: string;
  aliases: string[];
  image: string;
  description: string;
  tags: string[];
  altitude: number;
  access: string;
  fourWheel: boolean;
  family: boolean;
  camp: boolean;
};
export const EXPLORE_REGIONS = [
  { id: "all", label: "All Regions" },
  { id: "hunza", label: "Hunza & Nagar" },
  { id: "skardu", label: "Skardu & Baltistan" },
  { id: "fairy", label: "Fairy Meadows & Nanga Parbat" },
  { id: "swat", label: "Swat & Kalam" },
  { id: "chitral", label: "Chitral & Kalash" },
] as const;
export const EXPLORE_DESTINATIONS: ExploreDestination[] = [
  {
    id: "hunza",
    name: "Hunza Valley (Aliabad & Karimabad)",
    region: "hunza",
    searchName: "Hunza",
    aliases: ["hunza", "nagar", "karimabad", "aliabad"],
    image: "/explore/hunza.jpg",
    description:
      "Terraced apricot orchards, Baltit and Altit forts, and panoramic views of Rakaposhi and the Karakoram peaks.",
    tags: ["Historic Forts", "Apricot Blossoms", "Coaster & 4×4 Links"],
    altitude: 2438,
    access: "Valley routes",
    fourWheel: true,
    family: true,
    camp: false,
  },
  {
    id: "skardu",
    name: "Skardu & Deosai Plains",
    region: "skardu",
    searchName: "Skardu",
    aliases: ["skardu", "baltistan", "deosai", "shangrila"],
    image: "/explore/skardu-deosai.jpg",
    description:
      "The Land of Giants plateau, Shangrila, Lower Kachura, Cold Desert Katpana, and remarkable mountain scenery.",
    tags: ["Highest Plateau", "Shangrila Lake", "Himalayan Bears"],
    altitude: 4114,
    access: "4×4 routes",
    fourWheel: true,
    family: true,
    camp: true,
  },
  {
    id: "fairy",
    name: "Fairy Meadows & Raikot",
    region: "fairy",
    searchName: "Fairy Meadows",
    aliases: ["fairy meadows", "raikot", "nanga parbat"],
    image: "/explore/fairy-meadows.jpg",
    description:
      "Raikot Bridge jeep tracks, Beyal Camp glacier views, and face-to-face vistas of Nanga Parbat.",
    tags: ["Nanga Parbat View", "Cliffside Jeep Safari", "Camp Log Cabins"],
    altitude: 3300,
    access: "Jeep & trek access",
    fourWheel: true,
    family: false,
    camp: true,
  },
  {
    id: "swat",
    name: "Swat, Kalam & Mahodand",
    region: "swat",
    searchName: "Swat",
    aliases: ["swat", "kalam", "mahodand"],
    image: "/explore/swat-kalam.jpg",
    description:
      "Ushu Forest cedars, Matiltan cascading waterfalls, and calm lake waters in the green valleys of Swat.",
    tags: ["Pine Forests", "Emerald Lakes", "Valley Escapes"],
    altitude: 2000,
    access: "Valley journeys",
    fourWheel: true,
    family: true,
    camp: false,
  },
  {
    id: "kumrat",
    name: "Kumrat Valley & Panjkora",
    region: "swat",
    searchName: "Kumrat",
    aliases: ["kumrat", "panjkora", "dir"],
    image: "/explore/kumrat.jpg",
    description:
      "Towering deodar woodlands, pristine Panjkora streams, and trails leading into the quiet mountain wilderness.",
    tags: ["Dense Deodar Woods", "Waterfall Trails", "4×4 Camper"],
    altitude: 2400,
    access: "Camp country",
    fourWheel: true,
    family: true,
    camp: true,
  },
  {
    id: "khunjerab",
    name: "Khunjerab Pass & Sost",
    region: "hunza",
    searchName: "Sost",
    aliases: ["khunjerab", "sost", "gojal"],
    image: "/explore/khunjerab.jpg",
    description:
      "A high-altitude border crossing with sweeping Karakoram views and journeys through the upper Hunza valley.",
    tags: ["High Mountain Border", "Snow Leopard Habitat", "Karakoram Highway"],
    altitude: 4693,
    access: "High-altitude pass",
    fourWheel: true,
    family: false,
    camp: false,
  },
];
export type ExploreFilters = {
  query: string;
  region: string;
  fourWheel: boolean;
  family: boolean;
  camp: boolean;
  verified: boolean;
  transport: boolean;
  maxAltitude: number;
  maxPrice: number;
  sort: string;
};
export function readExploreFilters(params: URLSearchParams): ExploreFilters {
  const positive = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    query: (params.get("q") ?? "").slice(0, 160),
    region: EXPLORE_REGIONS.some((r) => r.id === params.get("region"))
      ? params.get("region")!
      : "all",
    fourWheel: params.get("fourWheel") === "1",
    family: params.get("family") === "1",
    camp: params.get("camp") === "1",
    verified: params.get("verified") === "1",
    transport: params.get("transport") === "1",
    maxAltitude: positive("altitude", 5000),
    maxPrice: positive("price", Infinity),
    sort: ["name", "price"].includes(params.get("sort") ?? "")
      ? params.get("sort")!
      : "featured",
  };
}
export function destinationMatches(
  destination: ExploreDestination,
  place: string,
) {
  const normalized = place.trim().toLowerCase();
  return destination.aliases.some((alias) => normalized.includes(alias));
}
export function destinationInventory(
  destination: ExploreDestination,
  trips: TripWithDetails[],
) {
  const matches = trips.filter((trip) =>
    destinationMatches(destination, trip.to),
  );
  return {
    trips: matches,
    cheapest: [...matches].sort((a, b) => a.price - b.price)[0],
    verified: matches.some((trip) => trip.agency.verified),
  };
}
export function filterDestinations(
  filters: ExploreFilters,
  trips: TripWithDetails[],
  verifiedPlaces: string[] = [],
) {
  const query = filters.query.trim().toLowerCase();
  return EXPLORE_DESTINATIONS.filter((place) => {
    const inventory = destinationInventory(place, trips);
    return (
      (filters.region === "all" || place.region === filters.region) &&
      (!query ||
        [place.name, place.description, ...place.tags, ...place.aliases]
          .join(" ")
          .toLowerCase()
          .includes(query)) &&
      (!filters.fourWheel || place.fourWheel) &&
      (!filters.family || place.family) &&
      (!filters.camp || place.camp) &&
      (!filters.verified ||
        inventory.verified ||
        verifiedPlaces.some((city) => destinationMatches(place, city))) &&
      (!filters.transport || inventory.trips.length > 0) &&
      place.altitude <= filters.maxAltitude &&
      (filters.maxPrice === Infinity ||
        (!!inventory.cheapest && inventory.cheapest.price <= filters.maxPrice))
    );
  }).sort((a, b) =>
    filters.sort === "name"
      ? a.name.localeCompare(b.name)
      : filters.sort === "price"
        ? (destinationInventory(a, trips).cheapest?.price ?? Infinity) -
          (destinationInventory(b, trips).cheapest?.price ?? Infinity)
        : 0,
  );
}
