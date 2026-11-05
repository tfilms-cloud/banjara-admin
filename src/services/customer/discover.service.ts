import { customerGet } from "@/lib/customer-api";
import { normalizeMediaUrl } from "@/lib/customer-mappers";
import { serverGet } from "@/lib/server-api";
import type { DiscoverParams, DiscoverResult } from "@/types/customer/discover";

/** One call per Explore service: filtered, sorted, normalized cards plus the chips to show. */
export async function getDiscover(params: DiscoverParams): Promise<DiscoverResult> {
  const query = Object.fromEntries(
    Object.entries({ limit: 100, ...params }).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Record<string, string | number>;
  const data =
    typeof window === "undefined"
      ? await serverGet<DiscoverResult>("/discover", query)
      : await customerGet<DiscoverResult>("/discover", { params: query });
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      image: normalizeMediaUrl(item.image) ?? null,
    })),
  };
}
