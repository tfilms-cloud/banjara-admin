"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  Car,
  ChevronLeft,
  Crosshair,
  List,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  ExploreDiscoverFilters,
  ExploreServiceSelector,
} from "@/components/site/explore/service-catalog";
import { useDiscoverMap } from "@/hooks/use-discover-map";
import { useQuery } from "@/lib/live-query";
import { getDrivingRoute } from "@/services/customer/directions.service";
import { discoverParamsFromUrl, listingHref } from "@/lib/explore-discover";
import { directionsUrl } from "@/lib/map-config";
import { NEAR_MAX_KM, nearBounds, readNearMe } from "@/lib/near-me";
import { NearRange } from "./near-range";
import type { DiscoverCard } from "@/types/customer/discover";
import { MapCanvasLazy } from "./map-canvas-lazy";
import type { MapBox, PinCard } from "./map-canvas";
import styles from "./explore-map-page.module.css";

const NOUN = {
  transport: "rides",
  hotels: "stays",
  tours: "tours",
  guides: "guides",
  restaurants: "restaurants",
} as const;

const money = (card: DiscoverCard) =>
  card.price && card.price > 0 ? `Rs ${card.price.toLocaleString("en-PK")}` : null;
const initial = (title: string) => (title.trim()[0] ?? "•").toUpperCase();

/** "2026-11-04T08:00" -> "Wed 4 Nov · 8:00 AM" (Pakistan time, as published). */
function departure(iso?: string) {
  if (!iso) return null;
  const [date, time = ""] = iso.split("T");
  const day = new Date(`${date}T12:00:00+05:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h)) return day;
  const clock = `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  return `${day} · ${clock}`;
}

const wideQuery = "(min-width: 901px)";
function useIsWide() {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(wideQuery);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(wideQuery).matches,
    () => true,
  );
}

/** Full-screen map: the map fills the window; filters, results and details float over it. */
export function ExploreMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filterKey = params.toString();
  const { catalogFilters, filters, base, category } = discoverParamsFromUrl(params);
  const service = catalogFilters.service;
  // "Rides near me": the visitor's position and search radius (rides only).
  const near = service === "transport" ? readNearMe(params) : null;
  const [rangeOpen, setRangeOpen] = useState(false);
  const wide = useIsWide();
  // The toolbar wraps onto more rows on narrower windows, so measure it instead of guessing.
  const topRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(140);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const watch = new ResizeObserver(() => setTopHeight(Math.ceil(el.getBoundingClientRect().height)));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // "Search this area" state is tied to the filters it was made under.
  const [pending, setPending] = useState<{ key: string; box: MapBox } | null>(null);
  const [area, setArea] = useState<{ key: string; box: MapBox } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [locateToken, setLocateToken] = useState(0);
  const activeArea = area?.key === filterKey ? area.box : null;
  const pendingBox = pending?.key === filterKey ? pending.box : null;
  const bbox = activeArea
    ? [activeArea.west, activeArea.south, activeArea.east, activeArea.north]
        .map((n) => n.toFixed(5))
        .join(",")
    : undefined;

  const result = useDiscoverMap(base, category, bbox);
  const data = result.data;
  const pins = useMemo(
    () => (data?.items ?? []).filter((card): card is PinCard => !!card.location),
    [data],
  );
  const selected = pins.find((pin) => pin.id === picked) ?? null;
  // Near me: road distance, drive time and route from the visitor to the selected pickup.
  const routeTo = near && selected ? selected.location : null;
  const directions = useQuery({
    queryKey: ["directions", near?.lat, near?.lng, routeTo?.lat, routeTo?.lng],
    queryFn: () => getDrivingRoute({ lat: near!.lat, lng: near!.lng }, { lat: routeTo!.lat, lng: routeTo!.lng }),
    enabled: !!near && !!routeTo,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const road = routeTo ? (directions.data ?? null) : null;

  const backHref = `/explore${filterKey ? `?${filterKey}` : ""}`;
  const stay = new URLSearchParams();
  for (const key of ["checkIn", "checkOut", "adults", "children", "rooms"]) {
    const value = searchParams.get(key);
    if (value) stay.set(key, value);
  }

  // The map owns the window: lock page scroll, and let Esc step back (card → list → page).
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (picked) setPicked(null);
      else router.push(backHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, router, backHref]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    // Near me belongs to rides; switching to another service drops the distance search.
    const effective =
      patch.service && patch.service !== "transport" ? { ...patch, near: null, radius: null } : patch;
    for (const [key, value] of Object.entries(effective)) {
      if (value === null || value === "" || value === "all" || value === "featured") {
        next.delete(key);
      } else next.set(key, value);
    }
    router.replace(`/explore/map${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const setRadius = (km: number) => {
    setRangeOpen(false);
    setPicked(null);
    update({ radius: String(km) });
  };
  const allRides = () => {
    setRangeOpen(false);
    update({ near: null, radius: null });
  };

  // Near me frames the search circle, so the visitor sees their surroundings even with few pins.
  const bounds = near ? nearBounds(near) : (data?.bounds ?? null);
  const loading = result.isPending;
  const empty = !loading && !result.isError && pins.length === 0;
  // Keep pins clear of the floating controls when fitting or centring.
  const inset = wide
    ? { top: topHeight + 24, left: 404 + 28, right: 70, bottom: 50 }
    : // On phones the detail sheet covers the lower half, so centre the pin above it.
      { top: topHeight + 30, left: 20, right: 20, bottom: selected ? 400 : 96 };
  const panelShown = wide || listOpen || !!selected;

  return (
    <div className={styles.shell} role="dialog" aria-label={`Map of ${NOUN[service]}`}>
      <div className={styles.mapFill}>
        <MapCanvasLazy
          pins={pins}
          selectedId={selected?.id ?? null}
          hoverId={hoverId}
          onSelect={setPicked}
          bounds={bounds}
          fitKey={`${filterKey}|${JSON.stringify(bounds)}`}
          autoFit={!activeArea}
          inset={inset}
          onUserMove={(box) => setPending({ key: filterKey, box })}
          locateToken={locateToken}
          nearby={near}
          drivingPath={road?.path ?? null}
          showTripRoute={!near}
          ariaLabel={`Map of ${NOUN[service]}`}
        />
      </div>

      <div className={styles.top} ref={topRef}>
        <div className={`${styles.topRow} ${styles.glass}`}>
          <Link
            href={backHref}
            className={styles.close}
            aria-label="Close map and go back to the list"
            title="Close (Esc)"
          >
            <X size={20} aria-hidden="true" />
          </Link>
          <ExploreServiceSelector filters={catalogFilters} update={update} />
          <form
            className={styles.search}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              update({
                q: String(new FormData(event.currentTarget).get("q") ?? "").trim(),
              });
            }}
          >
            <Search size={16} aria-hidden="true" />
            <input
              key={`${service}-${filters.query}`}
              name="q"
              defaultValue={filters.query}
              aria-label="Search the map"
              placeholder={`Search ${NOUN[service]}…`}
              maxLength={160}
            />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className={`${styles.chipsRow} ${styles.glass}`}>
          <ExploreDiscoverFilters
            filters={catalogFilters}
            data={data}
            selectedCategory={data?.applied.category ?? null}
            update={update}
          />
        </div>
      </div>

      <aside
        className={`${styles.panel} ${panelShown ? styles.panelOpen : ""}`}
        style={wide ? { top: topHeight + 14 + 12 } : undefined}
        aria-label={selected ? selected.title : `${NOUN[service]} on the map`}
      >
        {selected ? (
          <>
            <div className={styles.detailHero}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.image ?? "/home/karakoram-hero.png"} alt="" />
              <button type="button" className={styles.backBtn} onClick={() => setPicked(null)}>
                <ChevronLeft size={15} aria-hidden="true" />
                All {NOUN[service]}
              </button>
              <span className={styles.avatar}>
                {selected.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.image} alt="" />
                ) : (
                  initial(selected.title)
                )}
              </span>
            </div>
            <div className={styles.scroll} style={{ padding: 0 }}>
              <div className={styles.detailBody}>
                <div className={styles.topLine}>
                  <span className={styles.rating}>
                    <Star size={12} fill="currentColor" aria-hidden="true" />
                    {selected.rating ? selected.rating.toFixed(1) : "New"}
                    {selected.reviewCount > 0 ? ` · ${selected.reviewCount} reviews` : ""}
                  </span>
                </div>
                <h2>
                  {selected.title}
                  {selected.verified && <BadgeCheck size={18} aria-label="Verified provider" />}
                </h2>
                {selected.subtitle && <p className={styles.sub}>{selected.subtitle}</p>}

                <div className={styles.facts}>
                  {near ? (
                    <div className={styles.fact}>
                      <Car size={18} aria-hidden="true" />
                      <div>
                        <small>From you to the pickup</small>
                        <strong aria-live="polite">
                          {road
                            ? `${road.distanceKm} km by road · about ${road.durationMin} min drive`
                            : directions.isFetching
                              ? "Working out the road distance…"
                              : selected.distanceKm !== undefined
                                ? `${selected.distanceKm < 1 ? "Under 1" : selected.distanceKm} km away (straight line)`
                                : "Distance unavailable"}
                        </strong>
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.fact}>
                    <MapPin size={18} aria-hidden="true" />
                    <div>
                      <small>
                        {selected.location.approximate ? "Area" : selected.service === "transport" ? "Pickup" : "Address"}
                      </small>
                      <strong>{selected.location.address}</strong>
                    </div>
                  </div>
                  {selected.service === "transport" && selected.tags[0] && (
                    <div className={styles.fact}>
                      <Route size={18} aria-hidden="true" />
                      <div>
                        <small>Route</small>
                        <strong>{selected.tags[0]}</strong>
                      </div>
                    </div>
                  )}
                  {selected.departsAt && (
                    <div className={styles.fact}>
                      <CalendarClock size={18} aria-hidden="true" />
                      <div>
                        <small>Departs</small>
                        <strong>{departure(selected.departsAt)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {selected.location.approximate && (
                  <p className={styles.note}>
                    Shown as an approximate area. The guide shares the exact meeting point after
                    you get in touch.
                  </p>
                )}
                {selected.tags.filter((_, i) => selected.service !== "transport" || i > 0).length >
                  0 && (
                  <div className={styles.chips} style={{ marginTop: 12 }}>
                    {selected.tags
                      .filter((_, i) => selected.service !== "transport" || i > 0)
                      .slice(0, 5)
                      .map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                  </div>
                )}
                {money(selected) && (
                  <div className={styles.priceRow}>
                    <strong>{money(selected)}</strong>
                    <span>{selected.priceUnit}</span>
                  </div>
                )}
                <div className={styles.actions}>
                  <Link
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    href={listingHref(selected, stay)}
                  >
                    View details
                  </Link>
                  {!selected.location.approximate && (
                    <a
                      className={`${styles.btn} ${styles.btnGhost}`}
                      href={directionsUrl(selected.location.lat, selected.location.lng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation size={15} aria-hidden="true" />
                      Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.panelHead}>
              <div>
                <h2>
                  {pins.length} {pins.length === 1 ? (near ? "ride" : "place") : NOUN[service]}
                  {near ? ` within ${near.radiusKm} km` : activeArea ? " in this area" : ""}
                </h2>
                <p>{near ? "Nearest pickup first · tap one to see it" : "Tap one to see it on the map"}</p>
              </div>
              {!wide && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Hide list"
                  onClick={() => setListOpen(false)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className={styles.scroll}>
              {pins.length === 0 && !loading && (
                <p className={styles.empty}>
                  {near
                    ? near.radiusKm >= NEAR_MAX_KM
                      ? `No pickups within ${near.radiusKm} km yet. You can browse all rides instead.`
                      : `No pickups within ${near.radiusKm} km yet. Widen the search distance on the map.`
                    : "Nothing to show for these filters yet."}
                </p>
              )}
              {pins.map((pin) => (
                <button
                  type="button"
                  key={pin.id}
                  className={styles.card}
                  aria-pressed={pin.id === picked}
                  onMouseEnter={() => setHoverId(pin.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(pin.id)}
                  onBlur={() => setHoverId(null)}
                  onClick={() => {
                    setPicked(pin.id);
                    setListOpen(false);
                  }}
                >
                  <span className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pin.image ?? "/home/karakoram-hero.png"} alt="" />
                    {pin.priceUnit && pin.service === "transport" && (
                      <span className={styles.badgeOn}>{pin.priceUnit.replace("per ", "")}</span>
                    )}
                  </span>
                  <span className={styles.cardBody}>
                    <h3>
                      <span>{pin.title}</span>
                      {pin.verified && <BadgeCheck size={15} aria-label="Verified" />}
                    </h3>
                    <span className={styles.where}>
                      <MapPin size={12} aria-hidden="true" />
                      <span>
                        {pin.distanceKm !== undefined && (
                          <b className={styles.distance}>
                            {pin.distanceKm < 1 ? "Under 1 km" : `${pin.distanceKm} km`} away ·{" "}
                          </b>
                        )}
                        {pin.location.address}
                      </span>
                    </span>
                    {pin.tags.length > 0 && (
                      <span className={styles.chips}>
                        {pin.tags.slice(0, 2).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </span>
                    )}
                    <span className={styles.cardFoot}>
                      <span className={styles.price}>
                        {money(pin) ?? <small>Ask for pricing</small>}
                        {money(pin) && pin.priceUnit && pin.service !== "transport" && (
                          <small> {pin.priceUnit}</small>
                        )}
                      </span>
                      <span className={styles.rating}>
                        <Star size={12} fill="currentColor" aria-hidden="true" />
                        {pin.rating ? pin.rating.toFixed(1) : "New"}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      <div className={styles.floatMid}>
        {near && !empty && !loading && !rangeOpen && (
          <button
            type="button"
            className={`${styles.pill} ${styles.pillPrimary}`}
            onClick={() => setRangeOpen((open) => !open)}
            aria-expanded={rangeOpen}
          >
            <LocateFixed size={14} aria-hidden="true" />
            Within {near.radiusKm} km · Change
          </button>
        )}
        {activeArea ? (
          <button
            type="button"
            className={styles.pill}
            onClick={() => {
              setArea(null);
              setPending(null);
            }}
          >
            <X size={14} aria-hidden="true" />
            Clear area
          </button>
        ) : pendingBox ? (
          <button
            type="button"
            className={`${styles.pill} ${styles.pillPrimary}`}
            onClick={() => {
              setArea({ key: filterKey, box: pendingBox });
              setPending(null);
              setPicked(null);
            }}
          >
            <Search size={14} aria-hidden="true" />
            Search this area
          </button>
        ) : null}
        {!wide && !selected && (
          <button
            type="button"
            className={`${styles.pill} ${styles.listToggle}`}
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
          >
            <List size={14} aria-hidden="true" />
            {`List (${pins.length})`}
          </button>
        )}
      </div>
      <button
        type="button"
        className={styles.locate}
        aria-label="Show my location"
        onClick={() => setLocateToken((token) => token + 1)}
      >
        <Crosshair size={20} aria-hidden="true" />
      </button>

      {near && !loading && !result.isError && (empty || rangeOpen) && (
        // Sits low in the visible map so the visitor's dot and the search circle stay in view.
        <div
          className={`${styles.status} ${styles.statusLow}`}
          style={wide ? { paddingLeft: 404 + 14 } : undefined}
        >
          <NearRange
            key={near.radiusKm}
            radiusKm={near.radiusKm}
            empty={empty}
            onApply={setRadius}
            onAllRides={allRides}
            onClose={empty ? undefined : () => setRangeOpen(false)}
          />
        </div>
      )}
      {(loading || result.isError || (empty && !near)) && (
        <div className={styles.status} role="status">
          <div className={styles.statusCard}>
            {loading ? (
              <strong>Loading map…</strong>
            ) : result.isError ? (
              <>
                <strong>The map couldn’t load</strong>
                <p>Please check your connection and try again.</p>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => void result.refetch()}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <strong>No places on the map</strong>
                <p>
                  Nothing with a location matches these filters
                  {activeArea ? " in this area" : ""}.
                </p>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() =>
                    activeArea ? setArea(null) : update({ q: null, order: null, only: null })
                  }
                >
                  {activeArea ? "Clear area" : "Reset filters"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
