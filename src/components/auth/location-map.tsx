"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_TILES } from "@/lib/map-config";
import styles from "./location.module.css";

export type LatLng = { latitude: number; longitude: number };

/** The device's own position, shown as a blue dot with its accuracy circle. */
export type DevicePosition = LatLng & { accuracy: number };

/**
 * Map with a pin fixed in the centre: the driver moves the map under the pin,
 * like choosing a pickup spot in a ride app. Reports the centre when it settles.
 */
export default function LocationMap({
  center,
  zoom,
  flyTo,
  onCenterChange,
  onMoveStart,
  me,
}: {
  /** Where the map opens. */
  center: LatLng;
  zoom: number;
  /** Move the map here (search result, "use my location"). Changes trigger a fly. */
  flyTo?: (LatLng & { key: number; zoom?: number }) | null;
  onCenterChange: (point: LatLng) => void;
  onMoveStart?: () => void;
  /** Optional "you are here" dot (it never moves the pin by itself). */
  me?: DevicePosition | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);
  const callbacks = useRef({ onCenterChange, onMoveStart });
  useEffect(() => {
    callbacks.current = { onCenterChange, onMoveStart };
  });

  // Create the map once.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const instance = L.map(el, {
      center: [center.latitude, center.longitude],
      zoom,
      zoomControl: false,
      attributionControl: true,
    });
    instance.attributionControl.setPrefix(false);
    L.tileLayer(MAP_TILES.url, {
      maxZoom: MAP_TILES.maxZoom,
      attribution: MAP_TILES.attribution,
    }).addTo(instance);
    L.control.zoom({ position: "bottomright" }).addTo(instance);

    const report = () => {
      const c = instance.getCenter();
      callbacks.current.onCenterChange({ latitude: c.lat, longitude: c.lng });
    };
    instance.on("movestart", () => callbacks.current.onMoveStart?.());
    instance.on("moveend", report);
    // A click moves that spot under the pin.
    instance.on("click", (event: L.LeafletMouseEvent) => instance.panTo(event.latlng));
    map.current = instance;
    meLayer.current = L.layerGroup().addTo(instance);

    // The container can change size with the layout (e.g. phone rotation).
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      meLayer.current = null;
    };
    // The map is created once; later moves go through `flyTo`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flyTo || !map.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.current.flyTo([flyTo.latitude, flyTo.longitude], flyTo.zoom ?? 16, {
      animate: !reduce,
      duration: 0.8,
    });
  }, [flyTo]);

  // "You are here": blue dot + accuracy circle (redrawn when the position changes).
  useEffect(() => {
    const group = meLayer.current;
    if (!group) return;
    group.clearLayers();
    if (!me) return;
    L.circle([me.latitude, me.longitude], {
      radius: Math.max(5, me.accuracy),
      color: "#2563eb",
      weight: 1,
      fillColor: "#3b82f6",
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(group);
    L.circleMarker([me.latitude, me.longitude], {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
      interactive: false,
    }).addTo(group);
  }, [me]);

  return (
    <div className={styles.mapWrap}>
      <div ref={host} className={styles.map} aria-label="Map. Move the map to place the pin on your location." />
      <div className={styles.pin} aria-hidden="true">
        <span className={styles.pinHead} />
        <span className={styles.pinShadow} />
      </div>
    </div>
  );
}
