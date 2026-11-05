"use client";

import { ArrowUpDown, Check } from "lucide-react";
import type { DiscoverResult } from "@/types/customer/discover";
import styles from "./explore.module.css";

/**
 * Sort dropdown and quick-filter chips. The options, their labels and the rules behind
 * them all come from the server (GET /api/discover) — nothing is hard-coded here.
 * Rendered inline so it shares one row with the category chips.
 */
export function ExploreRefineBar({
  options,
  applied,
  update,
}: {
  options: DiscoverResult["options"];
  applied: DiscoverResult["applied"];
  update: (patch: Record<string, string | null>) => void;
}) {
  if (!options.sorts.length && !options.toggles.length) return null;
  const setOnly = (only: string[]) =>
    update({ only: only.length ? only.join(",") : null });
  return (
    <div className={styles.refineBar}>
      {options.categories.length > 0 && (
        <span className={styles.chipDivider} aria-hidden="true" />
      )}
      {options.sorts.length > 0 && (
        <label className={styles.sortSelect}>
          <ArrowUpDown size={14} aria-hidden="true" />
          Sort
          <select
            aria-label="Sort results"
            value={applied.order}
            onChange={(event) =>
              update({
                order:
                  event.target.value === "recommended"
                    ? null
                    : event.target.value,
              })
            }
          >
            {options.sorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {options.toggles.length > 0 && (
        <div className={styles.catalogChips} role="group" aria-label="Quick filters">
          {options.toggles.map((item) => {
            const on = applied.only.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                aria-pressed={on}
                onClick={() =>
                  setOnly(
                    on
                      ? applied.only.filter((id) => id !== item.id)
                      : [...applied.only, item.id],
                  )
                }
              >
                {on && <Check size={14} aria-hidden="true" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
