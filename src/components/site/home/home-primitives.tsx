"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import styles from "./home.module.css";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p className={styles.eyebrow}>
          <span />
          {eyebrow}
        </p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {href && (
        <Link href={href}>
          {action ?? "View all"}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}

export function HomeDialog({
  title,
  children,
  onClose,
  preventClose = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  preventClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
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
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!preventClose) onClose();
      }}
      onClick={(event) => {
        if (!preventClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialogHeading}>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} disabled={preventClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function HomeState({
  title,
  description,
  retry,
  retryLabel = "Try again",
  loading = false,
}: {
  title: string;
  description: string;
  retry?: () => void;
  retryLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className={styles.empty} role={loading ? "status" : undefined}>
      <h3>{title}</h3>
      <p>{description}</p>
      {retry && (
        <button type="button" className={styles.primary} onClick={retry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function HomeImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  return (
    <img
      ref={ref}
      src={src || "/home/karakoram-hero.png"}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={() => {
        if (
          ref.current &&
          !ref.current.src.endsWith("/home/karakoram-hero.png")
        )
          ref.current.src = "/home/karakoram-hero.png";
      }}
    />
  );
}
