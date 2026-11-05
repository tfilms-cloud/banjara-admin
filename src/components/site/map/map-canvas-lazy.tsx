"use client";

import dynamic from "next/dynamic";
import styles from "./map.module.css";

/** Leaflet touches `window`, so the map is only ever loaded in the browser. */
export const MapCanvasLazy = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => (
    <div className={styles.canvas} role="status" aria-label="Loading map" />
  ),
});
