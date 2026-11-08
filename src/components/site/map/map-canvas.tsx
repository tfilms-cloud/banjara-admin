"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_TILES,
  pinPrice,
} from "@/lib/map-config";
import type { DiscoverCard } from "@/types/customer/discover";
import styles from "./map.module.css";

export type MapInset = { top: number; left: number; right: number; bottom: number };
export type MapBox = { west: number; south: number; east: number; north: number };
export type PinCard = DiscoverCard & {
  location: NonNullable<DiscoverCard["location"]>;
};
type Bounds = [[number, number], [number, number]];

type Props = {
  pins: PinCard[];
  selectedId?: string | null;
  hoverId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Fit the map to this box whenever `fitKey` changes. */
  bounds?: Bounds | null;
  fitKey?: string | number;
  /** Space taken by floating UI (panel, toolbars): pins are fitted and centred in what is left. */
  inset?: MapInset;
  /** Set false to keep the current view while results change (e.g. "search this area"). */
  autoFit?: boolean;
  /** False for the small preview: no dragging, zooming or clickable pins. */
  interactive?: boolean;
  /** Fires after the user (not the code) moves or zooms the map. */
  onUserMove?: (box: MapBox) => void;
  /** Increment to centre the map on the visitor's position. */
  locateToken?: number;
  /** "Near me": draw the visitor's position and the search radius. */
  nearby?: { lat: number; lng: number; radiusKm: number } | null;
  ariaLabel?: string;
};

/** First letter, for listings without a photo. */
const initial = (title: string) => (title.trim()[0] ?? "•").toUpperCase();

/**
 * Avatar pin: the listing's photo in a ring, a small price tag and a tail on the exact spot.
 * Built with DOM calls (not an HTML string) so titles and image URLs can never inject markup.
 */
function pinIcon(card: PinCard, selected: boolean, hover: boolean) {
  const root = document.createElement("span");
  root.className = [styles.avatarPin, selected ? styles.selected : "", hover ? styles.hover : ""]
    .filter(Boolean)
    .join(" ");
  if (selected) {
    const name = document.createElement("span");
    name.className = styles.pinName;
    name.textContent = card.title;
    root.appendChild(name);
  }
  const face = document.createElement("span");
  face.className = styles.face;
  face.textContent = initial(card.title);
  if (card.image) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = card.image;
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      face.textContent = "";
      face.appendChild(img);
    };
  }
  root.appendChild(face);
  const price = pinPrice(card.price);
  if (price) {
    const tag = document.createElement("span");
    tag.className = styles.tag;
    tag.textContent = `Rs ${price}`;
    root.appendChild(tag);
  }
  const tail = document.createElement("span");
  tail.className = styles.tail;
  root.appendChild(tail);
  return L.divIcon({
    className: styles.pinWrap,
    html: root,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/** Leaflet map with price pins, clustering and an optional route. Client-only. */
export default function MapCanvas({
  pins,
  selectedId = null,
  hoverId = null,
  onSelect,
  bounds = null,
  fitKey,
  autoFit = true,
  inset,
  interactive = true,
  onUserMove,
  locateToken = 0,
  nearby = null,
  ariaLabel = "Map of listings",
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<L.MarkerClusterGroup | null>(null);
  const extras = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; card: PinCard }>());
  const lastProgrammatic = useRef(0);
  const here = useRef<L.Layer | null>(null);
  const live = useRef({ onSelect, onUserMove, selectedId, hoverId, inset });
  // Keep the latest props for map event handlers. Declared first so every later effect sees them.
  useEffect(() => {
    live.current = { onSelect, onUserMove, selectedId, hoverId, inset };
  });

  const programmatic = () => {
    lastProgrammatic.current = Date.now();
  };

  // 1. create the map once
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const instance = L.map(el, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      zoomSnap: 0.25,
      attributionControl: true,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: false,
      keyboard: interactive,
    });
    instance.attributionControl.setPrefix(false);
    L.tileLayer(MAP_TILES.url, {
      maxZoom: MAP_TILES.maxZoom,
      attribution: MAP_TILES.attribution,
    }).addTo(instance);
    if (interactive) L.control.zoom({ position: "bottomright" }).addTo(instance);

    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: styles.pinWrap,
          html: `<span class="${styles.cluster}">${c.getChildCount()}</span>`,
          iconSize: [0, 0],
        }),
    });
    instance.addLayer(group);
    const extraLayer = L.layerGroup().addTo(instance);

    instance.on("click", () => live.current.onSelect?.(null));
    const moved = () => {
      if (Date.now() - lastProgrammatic.current < 900) return;
      const b = instance.getBounds();
      live.current.onUserMove?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };
    instance.on("dragend", moved);
    instance.on("zoomend", moved);

    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(el);

    map.current = instance;
    cluster.current = group;
    extras.current = extraLayer;
    const registry = markers.current;
    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      cluster.current = null;
      extras.current = null;
      registry.clear();
    };
    // `interactive` is fixed for the lifetime of a map instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. (re)build pins when the results change
  useEffect(() => {
    const instance = map.current;
    const group = cluster.current;
    const layer = extras.current;
    if (!instance || !group || !layer) return;
    group.clearLayers();
    layer.clearLayers();
    markers.current.clear();
    for (const card of pins) {
      const { lat, lng, approximate } = card.location;
      const marker = L.marker([lat, lng], {
        icon: pinIcon(card, card.id === live.current.selectedId, false),
        title: interactive ? card.title : undefined,
        alt: card.title,
        keyboard: interactive,
        interactive,
        riseOnHover: true,
      });
      if (interactive) {
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          live.current.onSelect?.(card.id);
        });
      }
      group.addLayer(marker);
      markers.current.set(card.id, { marker, card });
      if (approximate) {
        // Guides are shown as an area, not a doorstep.
        L.circle([lat, lng], {
          radius: 1500,
          color: "#0f9b98",
          weight: 1.5,
          dashArray: "5 5",
          fillColor: "#0f9b98",
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(layer);
      }
    }
  }, [pins, interactive]);

  // 3. fit the view when asked to
  useEffect(() => {
    const instance = map.current;
    if (!instance || !autoFit) return;
    programmatic();
    if (bounds) {
      const [[south, west], [north, east]] = bounds;
      if (south === north && west === east) {
        instance.setView([south, west], 12, { animate: false });
      } else {
        // Padding scales with the map so a small preview still fills its frame.
        const size = instance.getSize();
        const pad = Math.round(Math.min(56, Math.min(size.x, size.y) * 0.14));
        const room = live.current.inset ?? { top: 0, left: 0, right: 0, bottom: 0 };
        instance.fitBounds(bounds, {
          paddingTopLeft: [room.left + pad, room.top + pad],
          paddingBottomRight: [room.right + pad, room.bottom + pad],
          maxZoom: 13,
          animate: false,
        });
      }
    } else {
      instance.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, autoFit]);

  // 4. selection: restyle pins, draw the route, bring the pin into view
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const instance = map.current;
    const group = cluster.current;
    const layer = extras.current;
    if (!instance || !group || !layer) return;
    const restyle = (id: string | null, selected: boolean) => {
      const entry = id ? markers.current.get(id) : undefined;
      if (!entry) return;
      entry.marker.setIcon(pinIcon(entry.card, selected, false));
      entry.marker.setZIndexOffset(selected ? 1000 : 0);
    };
    restyle(previous.current, false);
    restyle(selectedId, true);
    previous.current = selectedId;

    // route overlay lives apart from the approximate-area circles
    layer.eachLayer((l) => {
      if ((l as L.Layer & { __route?: boolean }).__route) layer.removeLayer(l);
    });
    const entry = selectedId ? markers.current.get(selectedId) : undefined;
    if (!entry) return;
    const route = entry.card.route;
    // A ride that starts and ends in the same place has no line worth drawing.
    const hasRoute =
      !!route &&
      Math.abs(route.from.lat - route.to.lat) + Math.abs(route.from.lng - route.to.lng) > 0.02;
    if (route && hasRoute) {
      const line = L.polyline(
        [
          [route.from.lat, route.from.lng],
          [route.to.lat, route.to.lng],
        ],
        { color: "#0f9b98", weight: 3, dashArray: "7 9", opacity: 0.9, interactive: false },
      ) as L.Polyline & { __route?: boolean };
      line.__route = true;
      layer.addLayer(line);
      const end = L.marker([route.to.lat, route.to.lng], {
        icon: L.divIcon({
          className: styles.pinWrap,
          html: `<span class="${styles.routeEnd}"></span>`,
          iconSize: [0, 0],
        }),
        interactive: false,
      }) as L.Marker & { __route?: boolean };
      end.__route = true;
      layer.addLayer(end);
      const el = end.getElement()?.querySelector(`.${styles.routeEnd}`);
      if (el) el.textContent = `to ${route.to.name}`;
      programmatic();
      const room = live.current.inset ?? { top: 0, left: 0, right: 0, bottom: 0 };
      instance.fitBounds(line.getBounds(), {
        paddingTopLeft: [room.left + 70, room.top + 70],
        paddingBottomRight: [room.right + 70, room.bottom + 70],
        maxZoom: 11,
        animate: true,
      });
    } else {
      // zoom out of any cluster that hides the pin, then centre on it
      programmatic();
      group.zoomToShowLayer(entry.marker, () => {
        programmatic();
        const room = live.current.inset ?? { top: 0, left: 0, right: 0, bottom: 0 };
        const size = instance.getSize();
        const target = instance.latLngToContainerPoint(entry.marker.getLatLng());
        const middle = L.point(
          room.left + (size.x - room.left - room.right) / 2,
          room.top + (size.y - room.top - room.bottom) / 2,
        );
        instance.panBy(target.subtract(middle), { animate: true });
      });
    }
  }, [selectedId, pins]);

  // 5. hover highlight (list ↔ map)
  const hovered = useRef<string | null>(null);
  useEffect(() => {
    const restyle = (id: string | null, hover: boolean) => {
      const entry = id ? markers.current.get(id) : undefined;
      if (!entry || id === live.current.selectedId) return;
      entry.marker.setIcon(pinIcon(entry.card, false, hover));
    };
    restyle(hovered.current, false);
    restyle(hoverId, true);
    hovered.current = hoverId;
  }, [hoverId, pins]);

  // 6b. "near me": the visitor's dot and the search circle
  const nearLat = nearby?.lat;
  const nearLng = nearby?.lng;
  const nearKm = nearby?.radiusKm;
  useEffect(() => {
    const instance = map.current;
    if (!instance || nearLat === undefined || nearLng === undefined || !nearKm) return;
    const layer = L.layerGroup().addTo(instance);
    L.circle([nearLat, nearLng], {
      radius: nearKm * 1000,
      color: "#0f9b98",
      weight: 2,
      dashArray: "6 8",
      fillColor: "#16b364",
      fillOpacity: 0.07,
      interactive: false,
    }).addTo(layer);
    L.marker([nearLat, nearLng], {
      icon: L.divIcon({
        className: styles.pinWrap,
        html: `<span class="${styles.youDot}"></span><span class="${styles.youLabel}">You</span>`,
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: -100,
    }).addTo(layer);
    return () => {
      layer.remove();
    };
  }, [nearLat, nearLng, nearKm]);

  // 6. "my location"
  useEffect(() => {
    if (!locateToken || !map.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const instance = map.current;
        if (!instance) return;
        const point: [number, number] = [position.coords.latitude, position.coords.longitude];
        if (here.current) instance.removeLayer(here.current);
        here.current = L.circleMarker(point, {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        }).addTo(instance);
        programmatic();
        instance.flyTo(point, Math.max(instance.getZoom(), 11));
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [locateToken]);

  return (
    <div
      ref={host}
      className={`${styles.canvas} ${interactive ? "" : styles.compact}`}
      role="region"
      aria-label={ariaLabel}
    />
  );
}
