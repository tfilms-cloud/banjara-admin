import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Armchair } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./auth.module.css";

const DESTINATIONS = ["Hunza", "Skardu", "Gilgit", "Fairy Meadows"];

/**
 * Layout shared by every sign-in and sign-up page: the photo hero from the
 * mobile welcome screen on the left, and the form sheet on the right.
 */
export function AuthShell({
  caption,
  title,
  subtitle,
  step,
  backHref = "/",
  backLabel = "Back to BANJARA",
  footer,
  aside,
  wide = false,
  children,
}: {
  caption: string;
  title: string;
  subtitle?: ReactNode;
  /** Shows the mobile-style progress bars, e.g. { current: 1, total: 2 }. */
  step?: { current: number; total: number };
  backHref?: string;
  backLabel?: string;
  footer?: ReactNode;
  /** Replaces the photo side, e.g. with a map. */
  aside?: ReactNode;
  /** Wider form column for long forms. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      {aside ? <aside className={styles.asideCustom}>{aside}</aside> : null}
      <aside className={styles.hero} hidden={Boolean(aside)}>
        <span className={styles.heroImage}>
          <Image
            src="/home/karakoram-hero.png"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            style={{ objectFit: "cover" }}
          />
        </span>
        <Link href="/" className={styles.brand}>
          <BrandLogo size={40} />
          BANJARA
        </Link>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <span /> Northern Pakistan
          </p>
          <h2>Travel the north with confidence</h2>
          <p>
            Book rides with local drivers, stays and guides across Hunza,
            Skardu, Gilgit and more — in one place.
          </p>
          <div className={styles.chips}>
            {DESTINATIONS.map((place) => (
              <span key={place}>{place}</span>
            ))}
          </div>
          <div className={styles.trust}>
            <span>
              <BadgeCheck size={15} /> Verified drivers & hosts
            </span>
            <span>
              <Armchair size={15} /> Live seat maps
            </span>
          </div>
        </div>
      </aside>

      <main className={styles.panel}>
        <div className={styles.topBar}>
          <Link href={backHref} className={styles.back}>
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
          <Link href="/" className={styles.mobileBrand} aria-label="BANJARA home">
            <BrandLogo size={32} />
            BANJARA
          </Link>
        </div>
        <div className={`${styles.body} ${wide ? styles.bodyWide : ""}`}>
          <p className={styles.caption}>
            <span />
            {caption}
          </p>
          <h1 className={styles.title}>{title}</h1>
          {step ? (
            <div
              className={styles.progress}
              role="progressbar"
              aria-label={`Step ${step.current} of ${step.total}`}
              aria-valuemin={1}
              aria-valuemax={step.total}
              aria-valuenow={step.current}
            >
              {Array.from({ length: step.total }, (_, index) => (
                <span
                  key={index}
                  className={
                    index + 1 < step.current
                      ? styles.done
                      : index + 1 === step.current
                        ? styles.current
                        : undefined
                  }
                />
              ))}
            </div>
          ) : null}
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          {children}
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
