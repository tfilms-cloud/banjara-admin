import { customerGet } from "@/lib/customer-api";
import {
  mapPickupPoint,
  mapTrip,
  type AnyRecord,
} from "@/lib/customer-mappers";
import { mapTransportAgency } from "@/lib/agency-profile";
import { asArray, idOf } from "@/lib/utils";
import type { AgencyReview, AgencyTrip } from "@/types/customer/agency";

export async function getAgencyTrips(
  providerId: string,
): Promise<AgencyTrip[]> {
  type Page = { items: AnyRecord[]; pagination?: { totalPages: number } };
  const read = (page: number) =>
    customerGet<Page>("/trips/search", {
      params: { providerId, page, limit: 100 },
    });
  const first = await read(1),
    rows = [...asArray<AnyRecord>(first)];
  const pageCount = first.pagination?.totalPages || 1;
  for (let start = 2; start <= pageCount; start += 4) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(4, pageCount - start + 1) }, (_, i) =>
        read(start + i),
      ),
    );
    pages.forEach((p) => rows.push(...asArray<AnyRecord>(p)));
  }
  return [
    ...new Map(
      rows.map((raw) => {
        const trip = mapTrip(raw);
        return [
          trip.id,
          {
            ...trip,
            dropoffLocations: asArray<AnyRecord>(raw.dropoffPoints).map((p) =>
              mapPickupPoint(p, trip.id),
            ),
          },
        ] as const;
      }),
    ).values(),
  ].filter((t) => t.agencyId === providerId);
}
export async function getTransportAgency(providerId: string) {
  const raw = await customerGet<AnyRecord>(
    `/providers/public/${encodeURIComponent(providerId)}`,
  );
  if (
    !Array.isArray(raw.services) ||
    !raw.services.some((s) => s === "transport" || s === "carRental")
  )
    throw new Error("This provider does not have a transport profile.");
  return raw;
}
export { mapTransportAgency };
export async function getAgencyReviews(
  providerId: string,
): Promise<AgencyReview[]> {
  const raw = await customerGet<unknown>(
    `/reviews/provider/${encodeURIComponent(providerId)}`,
  );
  return asArray<AnyRecord>(raw)
    .filter((r) => r.serviceType === "transport")
    .map((r) => ({
      id: idOf(r),
      rating: Number(r.rating) || 0,
      comment: String(r.comment || r.serviceComment || ""),
      createdAt: String(r.createdAt || ""),
      reply: String(r.providerReply || ""),
    }));
}
