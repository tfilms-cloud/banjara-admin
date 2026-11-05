"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Maximize2, MapPin } from "lucide-react";
import { useDiscoverMap } from "@/hooks/use-discover-map";
import type { DiscoverParams } from "@/types/customer/discover";
import { MapCanvasLazy } from "./map-canvas-lazy";
import type { PinCard } from "./map-canvas";
import styles from "./explore-map-preview.module.css";

const NOUN = {
  transport: "rides",
  hotels: "stays",
  tours: "tours",
  guides: "guides",
  restaurants: "restaurants",
} as const;

/** A small, non-interactive map of the current results. Click it to open the full map. */
export function ExploreMapPreview({
  base,
  category,
  href,
  tall = false,
}: {
  base: DiscoverParams;
  category: string | undefined;
  /** The full-screen map with the same filters. */
  href: string;
  /** Fill the height of the column it sits in (the Explore side map). */
  tall?: boolean;
}) {
  const result = useDiscoverMap(base, category);
  const data = result.data;
  const pins = useMemo(
    () => (data?.items ?? []).filter((card): card is PinCard => !!card.location),
    [data],
  );
  if (result.isError || (!result.isPending && pins.length === 0)) return null;
  const noun = NOUN[base.service];
  return (
    <section className={`${styles.preview} ${tall ? styles.tall : ""}`} aria-label="Map preview">
      <MapCanvasLazy
        pins={pins}
        bounds={data?.bounds ?? null}
        fitKey={JSON.stringify(data?.bounds)}
        interactive={false}
        ariaLabel={`Map preview of ${noun}`}
      />
      <span className={styles.count}>
        <MapPin size={14} aria-hidden="true" />
        {result.isPending
          ? "Loading map…"
          : `${pins.length} ${pins.length === 1 ? "place" : noun} on the map`}
      </span>
      <Link href={href} className={styles.open} aria-label={`Open the full map of ${noun}`}>
        <span>
          <Maximize2 size={15} aria-hidden="true" />
          Open full map
        </span>
      </Link>
    </section>
  );
}
