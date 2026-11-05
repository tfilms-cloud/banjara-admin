"use client";
import Link from "next/link";
import {
  BedDouble,
  ArrowRight,
  Car,
  CheckCircle2,
  Coffee,
  Expand,
  Flame,
  Images,
  Maximize2,
  Sparkles,
  Users,
  Utensils,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { HomeImage } from "@/components/site/home/home-primitives";
import type { HotelRoom } from "@/types/customer/hotel";
import styles from "./hotel-details.module.css";

export function amenityIcon(label: string): LucideIcon {
  if (/wifi|wi-fi|internet/i.test(label)) return Wifi;
  if (/park|vehicle/i.test(label)) return Car;
  if (/breakfast|coffee|tea/i.test(label)) return Coffee;
  if (/dining|restaurant|meal|kitchen/i.test(label)) return Utensils;
  if (/heat|fire|bukhari/i.test(label)) return Flame;
  if (/pool|water|bath/i.test(label)) return Waves;
  if (/electric|power|generator|charging/i.test(label)) return Zap;
  return Sparkles;
}
export function HotelGallery({
  photos,
  name,
  onOpen,
  subject = "property",
}: {
  photos: string[];
  name: string;
  onOpen: (index: number) => void;
  subject?: "property" | "room" | "tour";
}) {
  if (!photos.length)
    return (
      <div className={styles.noPhotos}>
        <Images size={36} />
        <p>
          {subject === "tour"
            ? "Tour"
            : subject === "room"
              ? "Room"
              : "Property"}{" "}
          photos are being updated
        </p>
      </div>
    );
  return (
    <div
      className={styles.gallery}
      data-count={Math.min(photos.length, 5)}
      aria-label={
        subject === "tour"
          ? "Tour gallery"
          : subject === "room"
            ? "Room gallery"
            : "Property gallery"
      }
    >
      {photos.slice(0, 5).map((photo, index) => (
        <button
          key={photo}
          type="button"
          className={index === 0 ? styles.mainPhoto : styles.galleryPhoto}
          onClick={() => onOpen(index)}
          aria-label={`View ${subject} photo ${index + 1} of ${photos.length}`}
        >
          <HomeImage
            src={photo}
            alt={`${name} · photo ${index + 1}`}
            eager={index < 2}
          />
          {index === 0 && (
            <span className={styles.heroCaption}>
              <small>
                {subject === "tour"
                  ? "EXPEDITION GALLERY"
                  : subject === "room"
                    ? "ROOM GALLERY"
                    : "YOUR NEXT STAY"}
              </small>
              <strong>{name}</strong>
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        className={styles.galleryOpen}
        onClick={() => onOpen(0)}
      >
        <Images size={16} />
        Show all {photos.length} photos
      </button>
    </div>
  );
}
export function HotelRoomCard({
  room,
  selected,
  onSelect,
  onDetails,
  detailsHref,
}: {
  room: HotelRoom;
  selected: boolean;
  onSelect: () => void;
  onDetails?: () => void;
  detailsHref?: string;
}) {
  const photo = (
    <>
      <HomeImage src={room.images[0]} alt={room.name} />
      <span>{room.bedType || "Room"}</span>
      <Expand size={16} aria-hidden="true" />
    </>
  );
  return (
    <article className={styles.roomCard} data-selected={selected}>
      {detailsHref ? (
        <Link
          href={detailsHref}
          className={styles.roomPhoto}
          aria-label={`View details for ${room.name}`}
        >
          {photo}
        </Link>
      ) : (
        <button
          type="button"
          className={styles.roomPhoto}
          onClick={onDetails}
          aria-label={`View details for ${room.name}`}
        >
          {photo}
        </button>
      )}
      <div className={styles.roomBody}>
        <div className={styles.roomHeading}>
          <h3>{room.name}</h3>
          <p>
            <strong>Rs {room.pricePerNight.toLocaleString("en-PK")}</strong>
            <span> / night</span>
          </p>
        </div>
        {room.description && <p>{room.description}</p>}
        <div className={styles.tags}>
          <span>
            <BedDouble size={13} />
            {room.bedType || "Room"}
          </span>
          <span>
            <Users size={13} />
            Up to {room.capacity} guests
          </span>
          {room.sizeSqm > 0 && (
            <span>
              <Maximize2 size={13} />
              {room.sizeSqm} m²
            </span>
          )}
          {room.breakfastIncluded && (
            <span>
              <Coffee size={13} />
              Breakfast included
            </span>
          )}
        </div>
        {detailsHref && (
          <Link href={detailsHref} className={styles.roomDetailsLink}>
            View room details <ArrowRight size={14} />
          </Link>
        )}
        <footer>
          <small>
            <CheckCircle2 size={14} />
            {room.availableRooms} available for your dates
          </small>
          <button
            type="button"
            className={selected ? styles.selectedButton : styles.primary}
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={`Select ${room.name}`}
          >
            {selected ? "Selected" : "Select room"}
          </button>
        </footer>
      </div>
    </article>
  );
}
