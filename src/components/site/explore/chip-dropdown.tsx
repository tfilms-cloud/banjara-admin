"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./explore-layout.module.css";

export type DropdownOption = {
  value: string;
  label: string;
  /** Shorter text for the chip itself (e.g. "4+ seats" instead of a long label). */
  chipLabel?: string;
  icon?: ReactNode;
  hint?: string;
};

type Position = { top: number; left: number; minWidth: number; maxHeight: number };

/**
 * A filter chip that opens a styled option list (instead of the browser's native select).
 * The list is rendered in a portal with fixed positioning so a scrolling, faded chip row
 * can never clip it. Keyboard: ↑/↓/Home/End move, Enter/Space choose, Esc/Tab close.
 */
export function ChipDropdown({
  icon,
  value,
  options,
  onChange,
  label,
  active,
  className = "",
  align = "start",
}: {
  icon: ReactNode;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Accessible name, also shown as the list's heading. */
  label: string;
  active?: boolean;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [focus, setFocus] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  const place = () => {
    const el = button.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 232);
    const gutter = 12;
    let left = align === "end" ? r.right - width : r.left;
    left = Math.min(Math.max(gutter, left), window.innerWidth - width - gutter);
    const below = window.innerHeight - r.bottom - gutter - 8;
    setPos({ top: r.bottom + 8, left, minWidth: width, maxHeight: Math.max(180, Math.min(360, below)) });
  };

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) close(false);
    };
    const onMove = (event: Event) => {
      // Scrolling inside the list is fine; anything else repositions (or closes if the chip left the screen).
      if (menu.current?.contains(event.target as Node)) return;
      const r = button.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) close(false);
      else place();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the focused option focused (and in view) as the user moves through the list.
  useEffect(() => {
    if (!open || !pos) return;
    const el = menu.current?.querySelectorAll<HTMLElement>("[role=option]")[focus];
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "nearest" });
  }, [open, pos, focus]);

  const choose = (index: number) => {
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
    close();
  };

  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1;
    if (event.key === "ArrowDown") setFocus((f) => (f >= last ? 0 : f + 1));
    else if (event.key === "ArrowUp") setFocus((f) => (f <= 0 ? last : f - 1));
    else if (event.key === "Home") setFocus(0);
    else if (event.key === "End") setFocus(last);
    else if (event.key === "Escape") close();
    else if (event.key === "Tab") return close(false);
    else return;
    event.preventDefault();
  };

  const onButtonKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocus(selectedIndex);
      setOpen(true);
    }
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${styles.chip} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        data-active={active || undefined}
        onClick={() => {
          setFocus(selectedIndex);
          setOpen((o) => !o);
        }}
        onKeyDown={onButtonKey}
      >
        {icon}
        <span>{selected?.chipLabel ?? selected?.label}</span>
        <ChevronDown size={15} aria-hidden="true" className={styles.chevron} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menu}
            className={styles.menu}
            style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth, maxHeight: pos.maxHeight }}
          >
            <p className={styles.menuTitle} aria-hidden="true">
              {label}
            </p>
            <div id={id} role="listbox" aria-label={label} onKeyDown={onListKey}>
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={index === focus ? 0 : -1}
                    className={styles.menuOption}
                    onClick={() => choose(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        choose(index);
                      }
                    }}
                    onMouseEnter={() => setFocus(index)}
                  >
                    {option.icon && <span className={styles.menuIcon}>{option.icon}</span>}
                    <span className={styles.menuText}>
                      {option.label}
                      {option.hint && <small>{option.hint}</small>}
                    </span>
                    {isSelected && <Check size={17} className={styles.menuCheck} aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
