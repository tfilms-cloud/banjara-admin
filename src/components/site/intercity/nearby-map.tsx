"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_TILES } from "@/lib/map-config";
import type { NearbyDriver, NearbyRide } from "@/services/customer/intercity.service";
import x from "./intercity.module.css";

const COLORS = { pickup: "#0f9b98", driver: "#16b364", ride: "#f08a24", me: "#2563eb" };

/**
 * The pickup, the search circle, nearby drivers (approximate bases) and listed rides.
 * Circle markers need no image assets, so nothing breaks under the bundler.
 */
export default function NearbyMap({
  pickup,
  me,
  radiusKm,
  drivers,
  rides,
}: {
  pickup: { lat: number; lng: number };
  /** The rider's own position, when shared. */
  me?: { latitude: number; longitude: number; accuracy: number } | null;
  radiusKm: number;
  drivers: NearbyDriver[];
  rides: NearbyRide[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const instance = L.map(el, { zoomControl: false, attributionControl: true, center: [pickup.lat, pickup.lng], zoom: 11 });
    instance.attributionControl.setPrefix(false);
    L.tileLayer(MAP_TILES.url, { maxZoom: MAP_TILES.maxZoom, attribution: MAP_TILES.attribution }).addTo(instance);
    L.control.zoom({ position: "bottomright" }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      layer.current = null;
    };
    // Created once; the effect below redraws the contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group) return;
    group.clearLayers();
    const circle = L.circle([pickup.lat, pickup.lng], {
      radius: radiusKm * 1000,
      color: COLORS.pickup,
      weight: 1.5,
      fillOpacity: 0.06,
    }).addTo(group);
    for (const driver of drivers) {
      L.circleMarker([driver.approxLat, driver.approxLng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: COLORS.driver,
        fillOpacity: 1,
      })
        .bindTooltip(`${driver.name} · ${driver.distanceKm.toFixed(1)} km`)
        .addTo(group);
    }
    for (const ride of rides) {
      L.circleMarker([ride.lat, ride.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: COLORS.ride,
        fillOpacity: 1,
      })
        .bindTooltip(`${ride.route} · boards at ${ride.boardAt}`)
        .addTo(group);
    }
    L.circleMarker([pickup.lat, pickup.lng], {
      radius: 9,
      color: "#fff",
      weight: 3,
      fillColor: COLORS.pickup,
      fillOpacity: 1,
    })
      .bindTooltip("Your pickup")
      .addTo(group);
    if (me) {
      L.circleMarker([me.latitude, me.longitude], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: COLORS.me,
        fillOpacity: 1,
      })
        .bindTooltip("You are here")
        .addTo(group);
    }
    instance.fitBounds(circle.getBounds(), { padding: [12, 12] });
  }, [pickup.lat, pickup.lng, me, radiusKm, drivers, rides]);

  return (
    <div className={x.nearbyMap}>
      <div ref={host} className={x.nearbyCanvas} aria-hidden="true" />
      <ul className={x.legend} aria-hidden="true">
        <li>
          <i style={{ background: COLORS.pickup }} /> Your pickup
        </li>
        {me ? (
          <li>
            <i style={{ background: COLORS.me }} /> You
          </li>
        ) : null}
        <li>
          <i style={{ background: COLORS.driver }} /> Drivers (approx.)
        </li>
        <li>
          <i style={{ background: COLORS.ride }} /> Listed rides
        </li>
      </ul>
    </div>
  );
}
