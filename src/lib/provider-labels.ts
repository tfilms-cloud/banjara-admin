/**
 * What a provider does, in words an admin reads at a glance. Providers store both a
 * `services` key (what they offer today: transport = local driver) and an older
 * `providerType` (e.g. "vanOperator" from the agency era); `services` wins.
 */
const LABELS: Record<string, string> = {
  transport: "Local driver",
  hotel: "Lodging",
  tour: "Tour operator",
  travelGuide: "Guide",
  restaurant: "Restaurant",
  // Older provider types
  vanOperator: "Local driver",
  busOperator: "Local driver",
  carRental: "Local driver",
  travelAgency: "Travel agency",
  tourOperator: "Tour operator",
  resort: "Lodging",
  guestHouse: "Lodging",
  lodge: "Lodging",
};

export function providerServiceLabels(provider: { services?: string[]; providerType?: string[] }): string[] {
  const keys = provider.services?.length ? provider.services : provider.providerType ?? [];
  return [...new Set(keys.map((key) => LABELS[key] ?? key))];
}
