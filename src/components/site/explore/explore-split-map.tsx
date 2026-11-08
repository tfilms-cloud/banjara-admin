"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Maximize2,
  MapPin,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { MapCanvasLazy } from "@/components/site/map/map-canvas-lazy";
import type { MapBox, PinCard } from "@/components/site/map/map-canvas";
import type { DiscoverCard } from "@/types/customer/discover";
import type { ExploreBox } from "@/lib/explore-refine";
import { CardIcon, unitLabel } from "./listing-card";
import styles from "./explore-layout.module.css";

type Bounds = [[number, number], [number, number]];

function boundsOf(pins: PinCard[]): Bounds | null {
  if (!pins.length) return null;
  const lats = pins.map((p) => p.location.lat);
  const lngs = pins.map((p) => p.location.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

/**
 * The map beside the results. It shows exactly the filtered cards, highlights the card under
 * the pointer, and can narrow the results to the visible area ("Search this area").
 */
export function ExploreSplitMap({
  cards,
  noun,
  hoverId,
  selectedId,
  onSelect,
  hrefFor,
  area,
  onSearchArea,
  onClearArea,
  fullHref,
}: {
  cards: DiscoverCard[];
  noun: string;
  hoverId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hrefFor: (card: DiscoverCard) => string;
  area: ExploreBox | null;
  onSearchArea: (box: ExploreBox) => void;
  onClearArea: () => void;
  fullHref: string;
}) {
  const pins = useMemo(
    () => cards.filter((card): card is PinCard => !!card.location),
    [cards],
  );
  const bounds = useMemo(() => boundsOf(pins), [pins]);
  // Refit only when the set of results changes, never while the visitor is exploring an area.
  const fitKey = useMemo(() => pins.map((p) => p.id).join("|"), [pins]);
  const [moved, setMoved] = useState<MapBox | null>(null);
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  return (
    <div className={styles.map}>
      <MapCanvasLazy
        pins={pins}
        bounds={bounds}
        fitKey={fitKey}
        autoFit={!area}
        hoverId={hoverId}
        selectedId={selectedId}
        onSelect={onSelect}
        onUserMove={setMoved}
        ariaLabel={`Map of ${noun}`}
      />
      <span className={styles.mapBadge}>
        <MapPin size={14} aria-hidden="true" />
        {pins.length} {pins.length === 1 ? "place" : noun} on the map
      </span>
      <div className={styles.mapTopRight}>
        {area && (
          <button
            type="button"
            className={styles.mapButton}
            onClick={() => {
              setMoved(null);
              onClearArea();
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset area
          </button>
        )}
        <Link
          href={fullHref}
          className={styles.mapButton}
          aria-label={`Open the full map of ${noun}`}
        >
          <Maximize2 size={14} aria-hidden="true" />
          Full map
        </Link>
      </div>
      {moved && (
        <button
          type="button"
          className={`${styles.mapButton} ${styles.searchArea}`}
          onClick={() => {
            onSearchArea(moved);
            setMoved(null);
          }}
        >
          <Search size={14} aria-hidden="true" />
          Search this area
        </button>
      )}
      {selected && (
        <div className={styles.popup} role="dialog" aria-label={selected.title}>
          {selected.image ? (
            <img src={selected.image} alt="" />
          ) : (
            <span className={styles.popupThumb}>
              <CardIcon kind={selected} size={24} />
            </span>
          )}
          <div>
            <strong>{selected.title}</strong>
            <small>
              {selected.price && selected.price > 0
                ? `PKR ${selected.price.toLocaleString("en-PK")} ${unitLabel(selected.priceUnit)}`
                : selected.subtitle || selected.city}
            </small>
          </div>
          <Link href={hrefFor(selected)} className={styles.cta}>
            View <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={styles.popupClose}
            onClick={() => onSelect(null)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
