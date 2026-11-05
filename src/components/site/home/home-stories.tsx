"use client";
/* eslint-disable @next/next/no-img-element */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import styles from "./stories.module.css";

/** One clip inside a story group. */
export type StorySlide = {
  video: string;
  caption: string;
  /** Small line above the caption, e.g. "Karakoram Highway". */
  place?: string;
  /** How long ago it was posted, shown next to the name. */
  posted: string;
};

/** One circle in the row: its clips, plus the action its call-to-action runs. */
export type StoryGroup = {
  id: string;
  title: string;
  text: string;
  icon: ComponentType<{ size?: number }>;
  image?: string;
  tone?: "coral" | "teal";
  cta: string;
  action: () => void;
  slides: StorySlide[];
};

/** Longest a single clip plays before moving on, in seconds. */
const MAX_SLIDE_SECONDS = 8;
const SEEN_KEY = "banjara.stories.seen";

const SEEN_EVENT = "banjara:stories-seen";

function readSeenRaw(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeSeen(callback: () => void) {
  window.addEventListener(SEEN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SEEN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function addSeen(id: string) {
  try {
    const current = JSON.parse(readSeenRaw()) as string[];
    if (current.includes(id)) return;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...current, id]));
    window.dispatchEvent(new Event(SEEN_EVENT));
  } catch {
    /* storage unavailable, rings just stay "new" */
  }
}

/** The row of story circles, and the full-screen viewer they open. */
export function HomeStories({
  groups,
  className,
  circleClassName,
}: {
  groups: StoryGroup[];
  className: string;
  circleClassName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeenRaw, () => "[]");
  const seen = useMemo<string[]>(() => {
    try {
      return JSON.parse(seenRaw) as string[];
    } catch {
      return [];
    }
  }, [seenRaw]);

  return (
    <>
      <nav className={className} aria-label="Stories from the north">
        {groups.map((group, index) => {
          const isSeen = seen.includes(group.id);
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`${group.title} story, ${group.slides.length} clips${isSeen ? ", watched" : ""}`}
            >
              <span
                className={`${styles.ring} ${isSeen ? styles.ringSeen : ""}`}
              >
                <span className={`${circleClassName} ${styles.circle}`}>
                  {group.image ? (
                    <img src={group.image} alt="" />
                  ) : (
                    <group.icon size={27} />
                  )}
                </span>
                {!isSeen && <span className={styles.liveDot}>NEW</span>}
              </span>
              <strong>{group.title}</strong>
              <small>{group.text}</small>
            </button>
          );
        })}
      </nav>
      {openIndex !== null && (
        <StoryViewer
          groups={groups}
          startIndex={openIndex}
          onSeen={addSeen}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

function StoryViewer({
  groups,
  startIndex,
  onSeen,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  onSeen: (id: string) => void;
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [muted, setMuted] = useState(true);
  const [readyKey, setReadyKey] = useState("");
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<number | null>(null);
  const wasHold = useRef(false);

  const group = groups[groupIndex];
  const slide = group.slides[slideIndex];
  const isPaused = paused || held;
  const slideKey = `${groupIndex}-${slideIndex}`;
  const loading = readyKey !== slideKey || buffering;

  useEffect(() => onSeen(group.id), [group.id, onSeen]);

  const goNext = useCallback(() => {
    setProgress(0);
    if (slideIndex < group.slides.length - 1) {
      setSlideIndex((index) => index + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((index) => index + 1);
      setSlideIndex(0);
    } else {
      onClose();
    }
  }, [slideIndex, group.slides.length, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (slideIndex > 0) {
      setSlideIndex((index) => index - 1);
    } else if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex((index) => index - 1);
      setSlideIndex(previous.slides.length - 1);
    } else {
      videoRef.current?.play().catch(() => {});
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [slideIndex, groupIndex, groups]);

  const jumpGroup = useCallback(
    (direction: 1 | -1) => {
      const target = groupIndex + direction;
      if (target < 0) return;
      if (target >= groups.length) return onClose();
      setProgress(0);
      setGroupIndex(target);
      setSlideIndex(0);
    },
    [groupIndex, groups.length, onClose],
  );

  // Play or pause the clip with the viewer state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) video.pause();
    else video.play().catch(() => {});
  }, [isPaused, groupIndex, slideIndex]);

  // Lock page scroll, and wire up the keyboard.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
      else if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [goNext, goPrev, onClose]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const length = Math.min(video.duration, MAX_SLIDE_SECONDS);
    const value = Math.min(video.currentTime / length, 1);
    setProgress(value);
    // Long clips are cut at the cap; short ones finish through onEnded.
    if (video.duration > MAX_SLIDE_SECONDS && value >= 1) goNext();
  };

  // Press and hold pauses; a quick tap moves left or right.
  const onPointerDown = () => {
    wasHold.current = false;
    holdTimer.current = window.setTimeout(() => {
      wasHold.current = true;
      setHeld(true);
    }, 220);
  };
  const onPointerUp = (side: "prev" | "next") => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (wasHold.current) {
      setHeld(false);
      return;
    }
    if (side === "next") goNext();
    else goPrev();
  };
  const onPointerCancel = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    setHeld(false);
  };

  const nextSlide =
    group.slides[slideIndex + 1] ?? groups[groupIndex + 1]?.slides[0];

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${group.title} story`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className={styles.closeFloating}
        onClick={onClose}
        aria-label="Close stories"
      >
        <X size={26} />
      </button>

      <button
        type="button"
        className={`${styles.groupNav} ${styles.groupPrev}`}
        onClick={() => jumpGroup(-1)}
        disabled={groupIndex === 0}
        aria-label="Previous story"
      >
        <ChevronLeft size={22} />
      </button>

      <div className={styles.stage} key={group.id}>
        <video
          key={slide.video}
          ref={videoRef}
          className={styles.video}
          src={slide.video}
          muted={muted}
          playsInline
          autoPlay
          preload="auto"
          onCanPlay={() => setReadyKey(slideKey)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => {
            setReadyKey(slideKey);
            setBuffering(false);
          }}
          onTimeUpdate={onTimeUpdate}
          onEnded={goNext}
          onError={goNext}
        />
        {nextSlide && (
          <video
            key={`preload-${nextSlide.video}`}
            src={nextSlide.video}
            preload="auto"
            muted
            className={styles.preload}
            aria-hidden="true"
          />
        )}
        <div className={styles.shadeTop} />
        <div className={styles.shadeBottom} />
        {loading && <span className={styles.spinner} aria-label="Loading" />}

        <div className={styles.top}>
          <div className={styles.bars}>
            {group.slides.map((item, index) => (
              <span key={item.video + index} className={styles.bar}>
                <span
                  className={styles.barFill}
                  style={{
                    transform: `scaleX(${index < slideIndex ? 1 : index === slideIndex ? progress : 0})`,
                  }}
                />
              </span>
            ))}
          </div>
          <div className={styles.header}>
            <span
              className={`${styles.avatar} ${group.tone === "coral" ? styles.avatarCoral : ""}`}
            >
              {group.image ? (
                <img src={group.image} alt="" />
              ) : (
                <group.icon size={17} />
              )}
            </span>
            <div className={styles.who}>
              <strong>{group.title}</strong>
              <span>{slide.posted}</span>
            </div>
            <div className={styles.controls}>
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Play" : "Pause"}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button
                type="button"
                className={styles.closeInline}
                onClick={onClose}
                aria-label="Close stories"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.tapZones}>
          <button
            type="button"
            aria-label="Previous clip"
            onPointerDown={onPointerDown}
            onPointerUp={() => onPointerUp("prev")}
            onPointerLeave={onPointerCancel}
            onContextMenu={(event) => event.preventDefault()}
          />
          <button
            type="button"
            aria-label="Next clip"
            onPointerDown={onPointerDown}
            onPointerUp={() => onPointerUp("next")}
            onPointerLeave={onPointerCancel}
            onContextMenu={(event) => event.preventDefault()}
          />
        </div>

        <div className={`${styles.bottom} ${held ? styles.hidden : ""}`}>
          {slide.place && <span className={styles.place}>{slide.place}</span>}
          <p>{slide.caption}</p>
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              onClose();
              group.action();
            }}
          >
            {group.cta}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.groupNav} ${styles.groupNext}`}
        onClick={() => jumpGroup(1)}
        aria-label="Next story"
      >
        <ChevronRight size={22} />
      </button>
    </div>,
    document.body,
  );
}
