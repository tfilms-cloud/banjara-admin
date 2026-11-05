"use client";

import { Smartphone } from "lucide-react";
import { PROVIDER_SECTIONS } from "@/lib/provider-sections";
import { BUILT_SECTIONS } from "./sections/provider-sections";
import styles from "./provider-section.module.css";

/** A provider section: the real page when built, otherwise what it will hold. */
export function ProviderSection({ section }: { section: string }) {
  const Built = BUILT_SECTIONS[section];
  if (Built) return <Built />;
  const info = PROVIDER_SECTIONS[section];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className={styles.card}>
      <span className={styles.icon}>
        <Icon size={22} />
      </span>
      <h2>{info.title}</h2>
      <p className={styles.intro}>{info.intro}</p>
      <ul className={styles.points}>
        {info.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className={styles.note}>
        <Smartphone size={15} /> This section is coming to the website soon. You can use it in the BANJARA app today.
      </p>
    </div>
  );
}
