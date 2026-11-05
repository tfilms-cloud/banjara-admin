"use client";
/* eslint-disable @next/next/no-img-element */

import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { uploadVehiclePhoto } from "@/services/customer/provider-application.service";
import styles from "./vehicle.module.css";

/** One photo slot: pick a file, it uploads straight away, then shows a preview. */
export function PhotoUpload({
  label,
  hint,
  value,
  onChange,
  onBusyChange,
  error,
  required = false,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const busy = progress !== null;
  const shownError = uploadError || error;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    setProgress(0);
    onBusyChange?.(true);
    try {
      onChange(await uploadVehiclePhoto(file, setProgress));
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : "The photo didn’t upload. Please try again.");
    } finally {
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={styles.photo}>
      <span className={styles.photoLabel} id={`${id}-label`}>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.fileInput}
        aria-labelledby={`${id}-label`}
        onChange={(event) => void pick(event.target.files?.[0])}
        disabled={busy}
      />
      {value && !busy ? (
        <div className={styles.preview}>
          <img src={value} alt={label} />
          <div className={styles.previewActions}>
            <button type="button" onClick={() => input.current?.click()}>
              <RefreshCw size={14} /> Replace
            </button>
            <button type="button" onClick={() => onChange("")} aria-label={`Remove ${label}`}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.dropzone} ${shownError ? styles.dropzoneError : ""}`}
          onClick={() => input.current?.click()}
          disabled={busy}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void pick(event.dataTransfer.files?.[0]);
          }}
        >
          {busy ? (
            <>
              <LoaderCircle size={20} className="animate-spin" />
              <span>Uploading… {progress}%</span>
            </>
          ) : (
            <>
              <ImagePlus size={20} />
              <span>Add photo</span>
              <small>{hint ?? "JPG, PNG or WebP, up to 5 MB"}</small>
            </>
          )}
        </button>
      )}
      {shownError ? <span className={styles.photoError}>{shownError}</span> : null}
    </div>
  );
}
