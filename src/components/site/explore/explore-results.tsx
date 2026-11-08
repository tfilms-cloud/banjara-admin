"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CarFront,
  Hotel,
  List,
  LocateFixed,
  Map as MapIcon,
  MountainSnow,
  SearchX,
  Signpost,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { EXPLORE_SERVICES, type ExploreService } from "@/lib/explore-catalog";
import { formatBox, type ExploreBox } from "@/lib/explore-refine";
import type { DiscoverCard } from "@/types/customer/discover";
import type { TripWithDetails } from "@/types/customer/trip";
import {
  CardSkeleton,
  DriverCard,
  ListingCard,
  groupDrivers,
} from "./listing-card";
import { ExploreSplitMap } from "./explore-split-map";
import styles from "./explore-layout.module.css";

/** Category icons, chosen to say what each category is at a glance. */
const SERVICE_ICONS = {
  transport: CarFront,
  hotels: Hotel,
  tours: MountainSnow,
  guides: Signpost,
  restaurants: UtensilsCrossed,
};
/** One-line hint under each category name. */
const TAB_HINT: Record<ExploreService, string> = {
  transport: "Cars, jeeps & vans",
  hotels: "Hotels & guest houses",
  tours: "Treks & expeditions",
  guides: "Local experts",
  restaurants: "Food & offers",
};
const NOUN: Record<ExploreService, [string, string]> = {
  transport: ["vehicle", "vehicles"],
  hotels: ["stay", "stays"],
  tours: ["tour", "tours"],
  guides: ["guide", "guides"],
  restaurants: ["restaurant", "restaurants"],
};
const TITLE: Record<ExploreService, string> = {
  transport: "Popular vehicles",
  hotels: "Places to stay",
  tours: "Tours & itineraries",
  guides: "Local guides",
  restaurants: "Most visited restaurants",
};

function useMedia(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function ExploreSectionHeader({
  eyebrow,
  title,
  description,
  id,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children && <div className={styles.sectionAside}>{children}</div>}
    </div>
  );
}

export function ExploreResults({
  service,
  view,
  cards,
  trips,
  loading,
  error,
  retry,
  clear,
  hrefFor,
  area,
  update,
  switchService,
  fullMapHref,
  onNearMe,
}: {
  service: ExploreService;
  view: "vehicles" | "drivers";
  cards: DiscoverCard[];
  trips: Map<string, TripWithDetails>;
  loading: boolean;
  error: boolean;
  retry: () => void;
  clear: () => void;
  hrefFor: (card: DiscoverCard) => string;
  area: ExploreBox | null;
  update: (patch: Record<string, string | null>) => void;
  switchService: (service: ExploreService) => void;
  fullMapHref: string;
  /** Rides only: find rides with pickups near the visitor. */
  onNearMe?: () => void;
}) {
  const desktop = useMedia("(min-width: 1024px)", true);
  const phone = useMedia("(max-width: 767px)", false);
  const [mapOpen, setMapOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The phone's floating Map pill belongs to the results, not to the sections below them.
  const listRef = useRef<HTMLDivElement>(null);
  const [listInView, setListInView] = useState(true);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setListInView(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const drivers = useMemo(
    () =>
      service === "transport" && view === "drivers"
        ? groupDrivers(cards, trips)
        : [],
    [service, view, cards, trips],
  );
  const showDrivers = service === "transport" && view === "drivers";
  const mapVisible = desktop || mapOpen;
  const [one, many] = showDrivers ? ["driver", "drivers"] : NOUN[service];
  const count = showDrivers ? drivers.length : cards.length;
  const selectedDriver = showDrivers
    ? drivers.find((d) => selectedId && d.cardIds.includes(selectedId))
        ?.providerId
    : null;

  // Marker clicked: highlight the card and bring it into view (not behind a full-screen map).
  const select = (id: string | null) => {
    setSelectedId(id);
    if (!id || (phone && mapOpen)) return;
    const driver = showDrivers
      ? drivers.find((d) => d.cardIds.includes(id))
      : null;
    const el = document.getElementById(
      driver ? `driver-${driver.providerId}` : `listing-${id}`,
    );
    el?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  };

  return (
    <section className={styles.results} aria-labelledby="explore-results-title">
      <div className={styles.tabsRow}>
        <nav className={styles.tabs} aria-label="Explore categories">
          {EXPLORE_SERVICES.map((item) => {
            const Icon = SERVICE_ICONS[item.id];
            return (
              <button
                type="button"
                key={item.id}
                aria-pressed={service === item.id}
                onClick={() => {
                  setSelectedId(null);
                  switchService(item.id);
                }}
              >
                <span className={styles.tabIcon}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className={styles.tabText}>
                  <strong>{item.label}</strong>
                  <small>{TAB_HINT[item.id]}</small>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <ExploreSectionHeader
        id="explore-results-title"
        title={showDrivers ? "Local drivers" : TITLE[service]}
        description={
          showDrivers
            ? "Every ride is driven by a local driver in their own vehicle."
            : "Published listings from BANJARA service providers."
        }
      >
        {service === "transport" && onNearMe && (
          <button type="button" className={`${styles.chip} ${styles.nearMe}`} onClick={onNearMe}>
            <LocateFixed size={16} aria-hidden="true" />
            Rides near me
          </button>
        )}
        {service === "transport" && (
          <div className={styles.segment} role="group" aria-label="Show">
            <button
              type="button"
              aria-pressed={!showDrivers}
              onClick={() => update({ view: null })}
            >
              <CarFront size={15} aria-hidden="true" />
              Vehicles
            </button>
            <button
              type="button"
              aria-pressed={showDrivers}
              onClick={() => update({ view: "drivers" })}
            >
              <UserRound size={15} aria-hidden="true" />
              Drivers
            </button>
          </div>
        )}
        <span className={styles.count} aria-live="polite">
          {loading ? (
            "Loading…"
          ) : (
            <>
              Showing <strong>{count}</strong> {count === 1 ? one : many}
            </>
          )}
        </span>
        <button
          type="button"
          className={`${styles.chip} ${styles.mapToggle}`}
          aria-pressed={mapOpen}
          onClick={() => setMapOpen((o) => !o)}
        >
          <MapIcon size={16} aria-hidden="true" />
          {mapOpen ? "Hide map" : "Show map"}
        </button>
      </ExploreSectionHeader>

      <div className={styles.split} data-map={mapOpen ? "open" : undefined}>
        <div className={styles.list} ref={listRef}>
          {loading ? (
            <div
              className={styles.grid}
              role="status"
              aria-label="Loading listings"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.state}>
              <SearchX size={32} aria-hidden="true" />
              <h3>Listings are temporarily unavailable</h3>
              <p>Please try loading this category again.</p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={retry}
              >
                Try again
              </button>
            </div>
          ) : count === 0 ? (
            <div className={styles.state}>
              <SearchX size={32} aria-hidden="true" />
              <h3>No {many} match your filters</h3>
              <p>
                Try a wider price range, another vehicle type, or a different
                place. You can also clear everything and start again.
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={clear}
              >
                Clear filters
              </button>
            </div>
          ) : showDrivers ? (
            <div className={styles.grid}>
              {drivers.map((driver, i) => (
                <DriverCard
                  key={driver.providerId}
                  driver={driver}
                  priority={i < 2}
                  active={!!hoverId && driver.cardIds.includes(hoverId)}
                  selected={selectedDriver === driver.providerId}
                  onHover={(on) => setHoverId(on ? driver.cardIds[0] : null)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {cards.map((card, i) => (
                <ListingCard
                  key={card.id}
                  card={card}
                  href={hrefFor(card)}
                  trip={trips.get(card.id)}
                  priority={i < 2}
                  active={hoverId === card.id}
                  selected={selectedId === card.id}
                  onHover={(on) => setHoverId(on ? card.id : null)}
                />
              ))}
            </div>
          )}
        </div>
        <aside className={styles.mapColumn} aria-label="Map">
          {mapVisible && (
            <ExploreSplitMap
              cards={loading ? [] : cards}
              noun={NOUN[service][1]}
              hoverId={hoverId}
              selectedId={selectedId}
              onSelect={select}
              hrefFor={hrefFor}
              area={area}
              onSearchArea={(box) => update({ bbox: formatBox(box) })}
              onClearArea={() => update({ bbox: null })}
              fullHref={fullMapHref}
            />
          )}
        </aside>
        {(listInView || mapOpen) && (
          <button
            type="button"
            className={styles.mapPill}
            onClick={() => setMapOpen((o) => !o)}
            aria-pressed={mapOpen}
          >
            {mapOpen ? (
              <List size={18} aria-hidden="true" />
            ) : (
              <MapIcon size={18} aria-hidden="true" />
            )}
            {mapOpen ? "List" : "Map"}
          </button>
        )}
      </div>
    </section>
  );
}
