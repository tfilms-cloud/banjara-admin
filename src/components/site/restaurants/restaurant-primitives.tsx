"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import gallery from "@/components/site/hotels/hotel-details.module.css";
import styles from "./restaurant-details.module.css";

/** Unavailable dining photography has a neutral placeholder, never another dish. */
export function RestaurantImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed || !src ? (
    <span className={styles.photoPlaceholder}>
      <Images size={32} />
      <span>Photo unavailable</span>
    </span>
  ) : (
    // Provider gallery URLs are dynamic and can use external media hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}

export function RestaurantGallery({
  photos,
  name,
  onOpen,
}: {
  photos: string[];
  name: string;
  onOpen: (index: number) => void;
}) {
  if (!photos.length)
    return (
      <div className={gallery.noPhotos}>
        <Images size={36} />
        <p>Restaurant photos are being updated</p>
      </div>
    );
  return (
    <div
      className={`${gallery.gallery} ${styles.gallery}`}
      data-count={Math.min(photos.length, 5)}
      aria-label="Restaurant gallery"
    >
      {photos.slice(0, 5).map((photo, index) => (
        <button
          key={photo}
          type="button"
          className={index === 0 ? gallery.mainPhoto : gallery.galleryPhoto}
          onClick={() => onOpen(index)}
          aria-label={`View restaurant photo ${index + 1} of ${photos.length}`}
        >
          <RestaurantImage
            key={photo}
            src={photo}
            alt={`${name} · photo ${index + 1}`}
            eager={index < 2}
          />
          {index === 0 && (
            <span className={gallery.heroCaption}>
              <small>A TASTE OF THE NORTH</small>
              <strong>{name}</strong>
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        className={gallery.galleryOpen}
        onClick={() => onOpen(0)}
      >
        <Images size={16} />
        Show all {photos.length} photos
      </button>
    </div>
  );
}
