"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
  CarFront,
  RefreshCw,
  Ticket,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BedDouble,
  Bus,
  BusFront,
  Clock,
  Flag,
  Footprints,
  House,
  LayoutGrid,
  MountainSnow,
  Sparkles,
  Tent,
  UserRound,
} from "lucide-react";
import { keepPreviousData, useQuery } from "@/lib/live-query";
import { ChipDropdown } from "./chip-dropdown";
import { getDiscover } from "@/services/customer/discover.service";
import { discoverParamsFromUrl, CATEGORY_KEY } from "@/lib/explore-discover";
import {
  DESTINATION_CITIES,
  EXPLORE_SORTS,
  PICKUP_CITIES,
  PRICE_CEILING,
  PRICE_STEP,
  RATING_OPTIONS,
  SEAT_OPTIONS,
  activeFilters,
  readExploreRefine,
  refineCards,
  type ActiveFilter,
} from "@/lib/explore-refine";
import type { ExploreService } from "@/lib/explore-catalog";
import type { DiscoverCard, DiscoverOptions } from "@/types/customer/discover";
import styles from "./explore-layout.module.css";

type Patch = Record<string, string | null>;

const PLACEHOLDER: Record<ExploreService, string> = {
  transport: "Search vehicles, drivers, places",
  hotels: "Search stays or places",
  tours: "Search tours or places",
  guides: "Search guides or places",
  restaurants: "Search restaurants or places",
};
const CATEGORY_LABEL: Record<string, string> = {
  transport: "Vehicle type",
  hotels: "Stay type",
  tours: "Tour type",
  guides: "Guide",
};

/** Plain-language hints under each vehicle/stay/tour option. */
const CATEGORY_HINT: Record<string, string> = {
  car: "Sedans & hatchbacks",
  jeep: "4x4 for mountain roads",
  suv: "Prado, Land Cruiser & similar",
  van: "Hiace & similar",
  mini_bus: "Coaster for groups",
  bus: "Large groups",
  other: "Other vehicle types",
  hotel: "Rooms with full service",
  guest_house: "Homely, family-run stays",
  lodge: "Budget beds & hostels",
  trek: "Walking routes",
  expedition: "Multi-day journeys",
  summit: "High-altitude climbs",
};
const SEAT_HINT: Record<number, string> = {
  2: "Small car",
  4: "Family car",
  7: "Jeep or van",
  12: "Coaster or bus",
};

/** Icon for a category option (returns an element, so nothing is created as a component during render). */
function categoryIcon(service: ExploreService, id: string) {
  const props = { size: 16, "aria-hidden": true as const };
  if (service === "hotels")
    return id === "guest_house" ? <House {...props} /> : id === "lodge" ? <Tent {...props} /> : <BedDouble {...props} />;
  if (service === "tours")
    return id === "summit" ? <MountainSnow {...props} /> : id === "expedition" ? <Flag {...props} /> : <Footprints {...props} />;
  if (service === "guides") return <UserRound {...props} />;
  if (id === "all") return <LayoutGrid {...props} />;
  if (id === "van") return <BusFront {...props} />;
  if (id === "mini_bus" || id === "bus") return <Bus {...props} />;
  return <CarFront {...props} />;
}

function sortIcon(id: string) {
  const props = { size: 16, "aria-hidden": true as const };
  if (id === "price") return <ArrowUpNarrowWide {...props} />;
  if (id === "price_desc") return <ArrowDownWideNarrow {...props} />;
  if (id === "rating") return <Star {...props} />;
  if (id === "soonest") return <Clock {...props} />;
  return <Sparkles {...props} />;
}

export function sortOptions(service: ExploreService) {
  return EXPLORE_SORTS.filter(
    (s) =>
      (!("transportOnly" in s) || service === "transport") &&
      !(service === "restaurants" && s.id.startsWith("price")),
  );
}

/* ── Price range: min/max inputs plus a dual-handle slider ─────────────── */
export function PriceRange({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const lo = min ?? 0;
  const hi = max ?? PRICE_CEILING;
  const pct = (n: number) => `${(Math.min(n, PRICE_CEILING) / PRICE_CEILING) * 100}%`;
  const read = (value: string) => (value.trim() === "" ? null : Math.max(0, Math.round(Number(value)) || 0));
  return (
    <div>
      <div className={styles.priceInputs}>
        <label>
          Min (PKR)
          <input
            className={styles.field}
            type="number"
            inputMode="numeric"
            min={0}
            step={PRICE_STEP}
            placeholder="0"
            value={min ?? ""}
            onChange={(e) => onChange(read(e.target.value), max)}
          />
        </label>
        <span aria-hidden="true">–</span>
        <label>
          Max (PKR)
          <input
            className={styles.field}
            type="number"
            inputMode="numeric"
            min={0}
            step={PRICE_STEP}
            placeholder="Any"
            value={max ?? ""}
            onChange={(e) => onChange(min, read(e.target.value))}
          />
        </label>
      </div>
      <div className={styles.slider}>
        <span className={styles.sliderTrack} />
        <span className={styles.sliderFill} style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
        <input
          type="range"
          aria-label="Minimum price"
          min={0}
          max={PRICE_CEILING}
          step={PRICE_STEP}
          value={Math.min(lo, PRICE_CEILING)}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi - PRICE_STEP);
            onChange(v > 0 ? v : null, max);
          }}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={0}
          max={PRICE_CEILING}
          step={PRICE_STEP}
          value={Math.min(hi, PRICE_CEILING)}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo + PRICE_STEP);
            onChange(min, v >= PRICE_CEILING ? null : v);
          }}
        />
      </div>
    </div>
  );
}

/* ── Desktop inline price popover ─────────────────────────────────────── */
function PricePopover({
  min,
  max,
  update,
  openPanel,
}: {
  min: number | null;
  max: number | null;
  update: (patch: Patch) => void;
  /** Below desktop the chip row scrolls (and fades), so the price filter opens in the filter panel instead. */
  openPanel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<[number | null, number | null]>([min, max]);
  const [left, setLeft] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      const target = event.target as Node;
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !panel.current?.contains(target) && !button.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const active = min !== null || max !== null;
  const label = active
    ? `${min ? `${(min / 1000).toFixed(min % 1000 ? 1 : 0)}k` : "0"} – ${max ? `${(max / 1000).toFixed(max % 1000 ? 1 : 0)}k` : "any"}`
    : "Price";
  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.chip}
        aria-expanded={open}
        aria-pressed={active}
        aria-haspopup="dialog"
        onClick={() => {
          if (window.matchMedia("(max-width: 1023px)").matches) {
            openPanel();
            return;
          }
          const host = button.current?.closest(`.${styles.barInner}`);
          if (button.current && host) {
            const b = button.current.getBoundingClientRect();
            const h = host.getBoundingClientRect();
            setLeft(Math.max(0, Math.min(b.left - h.left, h.width - 340)));
          }
          setDraft([min, max]);
          setOpen((o) => !o);
        }}
      >
        <CircleDollarSign size={16} aria-hidden="true" />
        {active ? `PKR ${label}` : label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div ref={panel} className={styles.popover} style={{ left }} role="dialog" aria-label="Price range">
          <p className={styles.groupTitle}>Price range</p>
          <PriceRange min={draft[0]} max={draft[1]} onChange={(a, b) => setDraft([a, b])} />
          <div className={styles.popoverActions}>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                update({ minPrice: null, maxPrice: null });
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                const [a, b] = draft;
                update({ minPrice: a ? String(a) : null, maxPrice: b !== null ? String(b) : null });
                setOpen(false);
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Filter panel: side panel on desktop, bottom sheet on phone ───────── */
function FilterPanel({
  params,
  service,
  categories,
  toggles,
  matchesRegion,
  apply,
  onClose,
}: {
  params: URLSearchParams;
  service: ExploreService;
  categories: DiscoverOptions["categories"];
  toggles: DiscoverOptions["toggles"];
  matchesRegion: (place: string) => boolean;
  apply: (next: URLSearchParams) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() => new URLSearchParams(params.toString()));
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  const set = (patch: Patch) =>
    setDraft((current) => {
      const next = new URLSearchParams(current.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  const refine = readExploreRefine(draft);
  const { base, category } = discoverParamsFromUrl(draft);
  // "Show N results" counts with the draft filters, exactly as the page will.
  const preview = useQuery({
    queryKey: ["customer", "explore", "discover", base, category],
    queryFn: () => getDiscover({ ...base, category }),
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
  const count = preview.data
    ? refineCards(preview.data.items.filter((card: DiscoverCard) => matchesRegion(card.city)), refine).length
    : null;
  const transport = service === "transport";
  const categoryKey = CATEGORY_KEY[service as keyof typeof CATEGORY_KEY];
  const only = (draft.get("only") ?? "").split(",").filter(Boolean);
  const toggleOnly = (id: string) => {
    const next = only.includes(id) ? only.filter((x) => x !== id) : [...only, id];
    set({ only: next.length ? next.join(",") : null });
  };
  const pick = (key: string, value: string, current: string | number | null) =>
    set({ [key]: String(current) === value ? null : value });

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label="Filters"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.sheetHead}>
        <h2>Filters</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close filters">
          <X size={20} />
        </button>
      </div>
      <div className={styles.sheetBody}>
        {service !== "restaurants" && (
          <section className={styles.group}>
            <h3>Price range (PKR)</h3>
            <PriceRange
              min={refine.minPrice}
              max={refine.maxPrice}
              onChange={(a, b) =>
                set({ minPrice: a ? String(a) : null, maxPrice: b !== null ? String(b) : null })
              }
            />
          </section>
        )}
        {categoryKey && categories.length > 0 && (
          <section className={styles.group}>
            <h3>{CATEGORY_LABEL[service]}</h3>
            <div className={styles.options}>
              {[...(transport ? [{ id: "all", label: "All" }] : []), ...categories].map((option) => {
                const current = draft.get(categoryKey) ?? (transport ? "all" : categories[0]?.id);
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={styles.option}
                    aria-pressed={current === option.id}
                    onClick={() => set({ [categoryKey]: option.id })}
                  >
                    {transport && <CarFront size={15} aria-hidden="true" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {transport && (
          <>
            <section className={styles.group}>
              <h3>Seats</h3>
              <div className={styles.options}>
                {SEAT_OPTIONS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={styles.option}
                    aria-pressed={refine.seats === n}
                    onClick={() => pick("passengers", String(n), refine.seats)}
                  >
                    <Users size={15} aria-hidden="true" />
                    {n}+
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.group}>
              <h3>Pricing</h3>
              <div className={styles.options}>
                {[
                  ["vehicle", "Whole vehicle"],
                  ["seat", "Per seat"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={styles.option}
                    aria-pressed={refine.bookingMode === id}
                    onClick={() => pick("bookingMode", id, refine.bookingMode)}
                  >
                    <Ticket size={15} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.group}>
              <h3>Trip type</h3>
              <div className={styles.options}>
                {[
                  ["one_way", "One way"],
                  ["round_trip", "Round trip"],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={styles.option}
                    aria-pressed={refine.journeyType === id}
                    onClick={() => pick("journeyType", id, refine.journeyType)}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.group}>
              <label>
                <span>Pickup city</span>
                <input
                  className={styles.field}
                  list="explore-pickup-cities"
                  placeholder="Any pickup"
                  value={draft.get("from") ?? ""}
                  maxLength={100}
                  onChange={(e) => set({ from: e.target.value })}
                />
              </label>
              <datalist id="explore-pickup-cities">
                {PICKUP_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </section>
            <section className={styles.group}>
              <label>
                <span>Destination / route</span>
                <input
                  className={styles.field}
                  list="explore-destination-cities"
                  placeholder="Any destination"
                  value={draft.get("to") ?? ""}
                  maxLength={100}
                  onChange={(e) => set({ to: e.target.value })}
                />
              </label>
              <datalist id="explore-destination-cities">
                {DESTINATION_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </section>
            <section className={styles.group}>
              <label>
                <span>Departure date</span>
                <input
                  className={styles.field}
                  type="date"
                  value={draft.get("date") ?? ""}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </label>
            </section>
          </>
        )}
        {service === "restaurants" && (
          <section className={styles.group}>
            <label>
              <span>City</span>
              <input
                className={styles.field}
                placeholder="Hunza, Skardu, Gilgit…"
                value={draft.get("city") ?? ""}
                maxLength={100}
                onChange={(e) => set({ city: e.target.value })}
              />
            </label>
          </section>
        )}
        <section className={styles.group}>
          <h3>Rating</h3>
          <div className={styles.options}>
            {RATING_OPTIONS.map((r) => (
              <button
                type="button"
                key={r}
                className={styles.option}
                aria-pressed={refine.rating === r}
                onClick={() => pick("rating", String(r), refine.rating)}
              >
                <Star size={15} aria-hidden="true" />
                {r}+
              </button>
            ))}
          </div>
        </section>
        {toggles.length > 0 && (
          <section className={styles.group}>
            {toggles.map((toggle) => (
              <label className={styles.toggleRow} key={toggle.id}>
                <span>
                  {toggle.id === "verified" && <BadgeCheck size={16} aria-hidden="true" />}
                  {toggle.id === "verified" ? "Verified only" : toggle.label}
                </span>
                <input
                  type="checkbox"
                  className={styles.switch}
                  checked={only.includes(toggle.id)}
                  onChange={() => toggleOnly(toggle.id)}
                />
              </label>
            ))}
          </section>
        )}
        <section className={styles.group}>
          <label>
            <span>Sort by</span>
            <select
              className={styles.field}
              value={refine.order}
              onChange={(e) => set({ order: e.target.value === "recommended" ? null : e.target.value })}
            >
              {sortOptions(service).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
      <div className={styles.sheetFoot}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            const next = new URLSearchParams();
            next.set("service", service);
            setDraft(next);
          }}
        >
          Clear all
        </button>
        <button type="button" className={styles.primaryButton} onClick={() => apply(draft)}>
          {count === null ? "Show results" : `Show ${count} ${count === 1 ? "result" : "results"}`}
        </button>
      </div>
    </dialog>
  );
}

/* ── The sticky bar ───────────────────────────────────────────────────── */
export function ExploreFilterBar({
  service,
  params,
  query,
  options,
  selectedCategory,
  update,
  replace,
  clearAll,
  matchesRegion,
}: {
  service: ExploreService;
  params: URLSearchParams;
  query: string;
  options?: DiscoverOptions;
  selectedCategory: string | null;
  update: (patch: Patch) => void;
  replace: (next: URLSearchParams) => void;
  clearAll: () => void;
  matchesRegion: (place: string) => boolean;
}) {
  const refine = readExploreRefine(params);
  const [panelOpen, setPanelOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Debounced search (300 ms). The field follows the URL when the query is cleared elsewhere.
  const [text, setText] = useState(query);
  const [synced, setSynced] = useState(query);
  if (query !== synced) {
    setSynced(query);
    setText(query);
  }
  const live = useRef(update);
  useEffect(() => {
    live.current = update;
  });
  useEffect(() => {
    const value = text.trim();
    if (value === query) return;
    const timer = window.setTimeout(() => live.current({ q: value || null }), 300);
    return () => window.clearTimeout(timer);
  }, [text, query]);

  // Publish the bar's height so the sticky map sits right under it.
  useEffect(() => {
    const el = root.current;
    const page = el?.parentElement;
    if (!el || !page) return;
    const observer = new ResizeObserver(() => page.style.setProperty("--x-bar", `${el.offsetHeight}px`));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const categories = options?.categories ?? [];
  const toggles = options?.toggles ?? [];
  const categoryKey = CATEGORY_KEY[service as keyof typeof CATEGORY_KEY];
  const vehicleLabel =
    service === "transport" && selectedCategory && selectedCategory !== "all"
      ? (categories.find((c) => c.id === selectedCategory)?.label ?? null)
      : null;
  const only = (params.get("only") ?? "").split(",").filter(Boolean);
  const chips: ActiveFilter[] = activeFilters(refine, { query, vehicleLabel, only });
  const panelCount = chips.filter((c) => c.key !== "q").length;
  const hasVerified = toggles.some((t) => t.id === "verified");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ q: text.trim() || null });
  };

  return (
    <div ref={root} className={styles.bar}>
      <div className={`${styles.container} ${styles.barInner}`}>
        <div className={styles.barRow}>
          <form className={styles.search} role="search" onSubmit={submit}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              name="q"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER[service]}
              aria-label="Search Explore"
              maxLength={160}
              enterKeyHint="search"
              autoComplete="off"
            />
            {text && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setText("");
                  update({ q: null });
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              className={`${styles.iconButton} ${styles.filtersIcon}`}
              onClick={() => setPanelOpen(true)}
              aria-label={`Filters${panelCount ? ` (${panelCount} active)` : ""}`}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              {panelCount > 0 && <span className={styles.badge}>{panelCount}</span>}
            </button>
            <button type="submit" className={styles.searchSubmit} aria-label="Search">
              <Search size={16} aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>

          <div className={styles.controls} role="group" aria-label="Quick filters">
            {service !== "restaurants" && (
              <PricePopover
                min={refine.minPrice}
                max={refine.maxPrice}
                update={update}
                openPanel={() => setPanelOpen(true)}
              />
            )}
            {categoryKey && categories.length > 0 && (
              <ChipDropdown
                label={CATEGORY_LABEL[service]}
                icon={categoryIcon(service, selectedCategory ?? "all")}
                value={selectedCategory ?? (service === "transport" ? "all" : categories[0]?.id)}
                active={!!vehicleLabel}
                onChange={(v) => update({ [categoryKey]: v })}
                options={[
                  ...(service === "transport"
                    ? [{ value: "all", label: "All vehicles", hint: "Every vehicle type", icon: categoryIcon(service, "all") }]
                    : []),
                  ...categories.map((c) => ({
                    value: c.id,
                    label: c.label,
                    hint: CATEGORY_HINT[c.id],
                    icon: categoryIcon(service, c.id),
                  })),
                ]}
              />
            )}
            {service === "transport" && (
              <ChipDropdown
                label="Seats"
                icon={<Users size={16} aria-hidden="true" />}
                value={refine.seats ? String(refine.seats) : ""}
                active={!!refine.seats}
                onChange={(v) => update({ passengers: v || null })}
                options={[
                  { value: "", label: "Any seats", hint: "Show every vehicle", icon: <Users size={16} aria-hidden="true" /> },
                  ...SEAT_OPTIONS.map((n) => ({
                    value: String(n),
                    label: `${n}+ seats`,
                    hint: SEAT_HINT[n],
                    icon: <Users size={16} aria-hidden="true" />,
                  })),
                ]}
              />
            )}
            {hasVerified && (
              <button
                type="button"
                className={styles.chip}
                aria-pressed={refine.verified}
                onClick={() => {
                  const next = refine.verified ? only.filter((x) => x !== "verified") : [...only, "verified"];
                  update({ only: next.length ? next.join(",") : null });
                }}
              >
                <BadgeCheck size={16} aria-hidden="true" />
                Verified
              </button>
            )}
            <button
              type="button"
              className={`${styles.chip} ${styles.moreFilters}`}
              onClick={() => setPanelOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              More filters
              {panelCount > 0 && <span className={styles.badge}>{panelCount}</span>}
            </button>
            <ChipDropdown
              label="Sort by"
              className={styles.sortChip}
              align="end"
              icon={<ArrowUpDown size={16} aria-hidden="true" />}
              value={refine.order}
              active={refine.order !== "recommended"}
              onChange={(v) => update({ order: v === "recommended" ? null : v })}
              options={sortOptions(service).map((o) => ({ value: o.id, label: o.label, icon: sortIcon(o.id) }))}
            />
          </div>
        </div>

        {chips.length > 0 && (
          <div className={styles.activeRow} aria-label="Active filters">
            {chips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                className={styles.activeChip}
                onClick={() => update(chip.clear)}
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.key === "from" || chip.key === "to" ? (
                  <MapPin size={13} aria-hidden="true" />
                ) : chip.key === "date" ? (
                  <CalendarDays size={13} aria-hidden="true" />
                ) : null}
                {chip.label}
                <X size={14} aria-hidden="true" />
              </button>
            ))}
            <button type="button" className={styles.textButton} onClick={clearAll}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {panelOpen && (
        <FilterPanel
          params={params}
          service={service}
          categories={categories}
          toggles={toggles}
          matchesRegion={matchesRegion}
          onClose={() => setPanelOpen(false)}
          apply={(next) => {
            replace(next);
            setPanelOpen(false);
          }}
        />
      )}
    </div>
  );
}
