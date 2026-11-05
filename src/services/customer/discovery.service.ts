import { customerGet } from "@/lib/customer-api";
import { normalizeMediaUrl, type AnyRecord } from "@/lib/customer-mappers";
import { serverGet } from "@/lib/server-api";
import { asArray, idOf } from "@/lib/utils";

export type DiscoveryListing = {
  id: string;
  name: string;
  destination: string;
  description: string;
  summary?: string;
  rating?: number;
  reviewCount?: number;
  image: string;
  price: number;
  priceUnit: string;
  verified: boolean;
  details: string[];
  phone?: string;
  gender?: string;
  tourType?: string;
  languages?: string[];
};
const record = (value: unknown): AnyRecord =>
  value && typeof value === "object" ? (value as AnyRecord) : {};
export async function getDiscoveryListings(
  kind: "guides" | "tours",
  destination?: string,
  date?: string,
  guests?: number,
): Promise<DiscoveryListing[]> {
  const path = kind === "guides" ? "/guides" : "/tour-itineraries";
  const params =
    kind === "guides"
      ? { destination: destination?.trim() || undefined, date, guests }
      : { limit: 100 };
  const data =
    typeof window === "undefined"
      ? await serverGet<unknown>(path, params)
      : await customerGet<unknown>(path, { params });
  return asArray<AnyRecord>(data)
    .map((raw) => {
      const guide = record(raw.guide);
      const provider = record(raw.providerId);
      const legacyGuide = record(raw.tour);
      const isGuide = kind === "guides";
      return {
        id: idOf(raw),
        gender: String(guide.gender ?? legacyGuide.gender ?? "").toLowerCase(),
        tourType: String(raw.tourType ?? "").toLowerCase(),
        languages: [
          ...new Set(
            [
              ...(Array.isArray(guide.languages)
                ? guide.languages
                    .map((language) =>
                      typeof language === "string"
                        ? language
                        : record(language).language,
                    )
                    .filter(Boolean)
                : []),
              ...(Array.isArray(
                guide.regionalLanguages ?? legacyGuide.regionalLanguages,
              )
                ? ((guide.regionalLanguages ??
                    legacyGuide.regionalLanguages) as string[])
                : []),
              ...(Array.isArray(
                guide.internationalLanguages ??
                  legacyGuide.internationalLanguages,
              )
                ? ((guide.internationalLanguages ??
                    legacyGuide.internationalLanguages) as string[])
                : []),
            ].map(String),
          ),
        ],
        name: String(
          isGuide
            ? (guide.fullName ?? raw.businessName ?? "Local guide")
            : (raw.title ?? "Mountain tour"),
        ),
        destination: String(
          isGuide ? (raw.city ?? guide.city ?? "") : (raw.destination ?? ""),
        ),
        description: String(
          isGuide
            ? (guide.detailedDescription ?? guide.shortBio ?? "")
            : (raw.description ?? raw.summary ?? ""),
        ),
        summary: String(isGuide ? (guide.shortBio ?? "") : (raw.summary ?? "")),
        rating: Number(raw.rating ?? provider.rating ?? 0),
        reviewCount: Number(raw.totalReviews ?? provider.totalReviews ?? 0),
        image:
          normalizeMediaUrl(
            String(
              isGuide
                ? (raw.logo ?? guide.profilePhoto ?? "")
                : (raw.coverImage ?? ""),
            ),
          ) ?? "",
        price: Number(
          isGuide ? (raw.fromPrice ?? 0) : (raw.pricePerPerson ?? 0),
        ),
        priceUnit: isGuide ? "from · guide service" : "per person",
        verified: isGuide
          ? guide.profileStatus === "approved"
          : provider.verificationStatus === "approved",
        phone:
          typeof guide.phone === "string"
            ? guide.phone
            : typeof provider.phone === "string"
              ? provider.phone
              : undefined,
        details: isGuide
          ? [
              Number(guide.yearsExperience ?? raw.yearsExperience) > 0
                ? `${guide.yearsExperience ?? raw.yearsExperience} years of experience`
                : "",
              ...(Array.isArray(guide.guideTypes)
                ? guide.guideTypes.map(String)
                : []),
            ].filter(Boolean)
          : [
              `${Number(raw.durationDays) || 1} days`,
              String(raw.difficulty ?? ""),
              String(raw.bestSeason ?? ""),
            ].filter(Boolean),
      };
    })
    .filter(
      (item) =>
        item.id &&
        (kind !== "tours" ||
          !destination?.trim() ||
          item.destination
            .toLowerCase()
            .includes(destination.trim().toLowerCase())),
    );
}
