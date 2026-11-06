"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BedDouble, Check, LoaderCircle, Minus, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/auth/photo-upload";
import { useQuery } from "@/lib/live-query";
import {
  ROOM_AMENITIES,
  ROOM_TYPES,
  createRoom,
  listMyRooms,
  removeRoom,
  updateRoom,
  type OwnerRoom,
  type RoomInput,
} from "@/services/customer/lodging.service";
import s from "./rooms.module.css";

const rupees = (value: number) => `Rs ${Math.round(value).toLocaleString("en-PK")}`;

export const CANCELLATION_POLICIES = [
  "Free cancellation up to 24 hours before check-in",
  "Free cancellation up to 3 days before check-in",
  "Non-refundable",
] as const;

const EMPTY: RoomInput = {
  name: "",
  roomType: "double",
  bedType: "",
  capacity: 2,
  size: 20,
  pricePerNight: 0,
  totalRooms: 1,
  amenities: [],
  breakfastIncluded: false,
  cancellationPolicy: CANCELLATION_POLICIES[0],
  images: [],
};

export function roomsQueryKey(hotelId: string) {
  return ["provider", "rooms", hotelId];
}

/**
 * The owner's room types: list, add, edit, hide. Used in the application (step 7)
 * and in the provider area's "My rooms".
 */
export function RoomEditor({ hotelId, onChange }: { hotelId: string; onChange?: (rooms: OwnerRoom[]) => void }) {
  const queryClient = useQueryClient();
  const rooms = useQuery({ queryKey: roomsQueryKey(hotelId), queryFn: () => listMyRooms(hotelId) });
  const [editing, setEditing] = useState<OwnerRoom | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const list = rooms.data ?? [];

  const refresh = async () => {
    const fresh = await queryClient.fetchQuery({
      queryKey: roomsQueryKey(hotelId),
      queryFn: () => listMyRooms(hotelId),
      staleTime: 0,
    });
    onChange?.(fresh);
  };

  const remove = async (room: OwnerRoom) => {
    setRemoving(room.id);
    try {
      await removeRoom(room.id);
      toast.success(`${room.name} is hidden from travellers.`);
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not remove the room.");
    } finally {
      setRemoving(null);
    }
  };

  if (rooms.isPending) {
    return (
      <p className={s.muted} role="status">
        <LoaderCircle size={15} className={s.spin} /> Loading rooms…
      </p>
    );
  }
  if (rooms.isError) return <p className={s.error}>{rooms.error.message}</p>;

  return (
    <div className={s.editor}>
      {list.length ? (
        <ul className={s.list}>
          {list.map((room) => (
            <li key={room.id} className={s.room}>
              {room.images[0] ? (
                <img src={room.images[0]} alt="" className={s.thumb} />
              ) : (
                <span className={s.thumb} aria-hidden="true">
                  <BedDouble size={20} />
                </span>
              )}
              <div className={s.roomMain}>
                <strong>{room.name}</strong>
                <span>
                  {ROOM_TYPES.find((t) => t.value === room.roomType)?.label ?? room.roomType} · {room.bedType} ·
                  <span className={s.guests} aria-label={`${room.capacity} guests`}>
                    <Users size={12} /> {room.capacity}
                  </span>
                </span>
                <span>
                  {room.totalRooms} {room.totalRooms === 1 ? "room" : "rooms"} of this type
                </span>
              </div>
              <div className={s.roomSide}>
                <strong>{rupees(room.pricePerNight)}</strong>
                <small>per night</small>
                <div className={s.roomActions}>
                  <button type="button" onClick={() => setEditing(room)} aria-label={`Edit ${room.name}`}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(room)}
                    disabled={removing === room.id}
                    aria-label={`Remove ${room.name}`}
                  >
                    {removing === room.id ? <LoaderCircle size={14} className={s.spin} /> : <Trash2 size={14} />} Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : editing ? null : (
        <p className={s.empty}>No rooms yet. Add each type of room you rent, with its price per night.</p>
      )}

      {editing ? (
        <RoomForm
          key={editing === "new" ? "new" : editing.id}
          hotelId={hotelId}
          room={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      ) : (
        <button type="button" className={s.add} onClick={() => setEditing("new")}>
          <Plus size={16} /> {list.length ? "Add another room type" : "Add a room type"}
        </button>
      )}
    </div>
  );
}

function RoomForm({
  hotelId,
  room,
  onCancel,
  onSaved,
}: {
  hotelId: string;
  room: OwnerRoom | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [x, setX] = useState<RoomInput>(() => (room ? { ...room } : { ...EMPTY }));
  const [price, setPrice] = useState(room ? String(room.pricePerNight) : "");
  const [size, setSize] = useState(room ? String(room.size) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof RoomInput>(key: K, value: RoomInput[K]) => setX((current) => ({ ...current, [key]: value }));
  const step = (key: "capacity" | "totalRooms", delta: number, max: number) =>
    set(key, Math.min(max, Math.max(1, x[key] + delta)));

  const save = async () => {
    const e: Record<string, string> = {};
    if (x.name.trim().length < 2) e.name = "Give this room type a name";
    if (x.bedType.trim().length < 2) e.bedType = "Describe the beds, e.g. 1 double bed";
    const nightly = Number(price);
    if (!Number.isFinite(nightly) || nightly <= 0) e.price = "Enter the price per night";
    if (!x.images.length) e.images = "Add at least one photo of this room";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setError("");
    const input: RoomInput = {
      ...x,
      name: x.name.trim(),
      bedType: x.bedType.trim(),
      pricePerNight: Math.round(nightly),
      size: Number(size) > 0 ? Math.round(Number(size)) : 20,
    };
    try {
      if (room) await updateRoom(room.id, input);
      else await createRoom(hotelId, input);
      toast.success(room ? "Room updated" : "Room added");
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the room.");
      setSaving(false);
    }
  };

  return (
    <div className={s.form} role="group" aria-label={room ? `Edit ${room.name}` : "New room type"}>
      <h3>{room ? `Edit ${room.name}` : "New room type"}</h3>
      {error ? <p className={s.error}>{error}</p> : null}
      <label className={s.field}>
        Room name *
        <input value={x.name} placeholder="e.g. Mountain view double" onChange={(e) => set("name", e.target.value)} maxLength={60} />
        {errors.name ? <small className={s.fieldError}>{errors.name}</small> : null}
      </label>
      <div className={s.field}>
        Room type *
        <div className={s.chips}>
          {ROOM_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              aria-pressed={x.roomType === type.value}
              className={`${s.chip} ${x.roomType === type.value ? s.chipOn : ""}`}
              onClick={() => set("roomType", type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <div className={s.row}>
        <label className={s.field}>
          Beds *
          <input value={x.bedType} placeholder="e.g. 1 double bed" onChange={(e) => set("bedType", e.target.value)} maxLength={60} />
          {errors.bedType ? <small className={s.fieldError}>{errors.bedType}</small> : null}
        </label>
        <label className={s.field}>
          Size (m², optional)
          <input inputMode="numeric" value={size} placeholder="20" onChange={(e) => setSize(e.target.value.replace(/\D/g, ""))} />
        </label>
      </div>
      <div className={s.row}>
        <div className={s.field}>
          Guests per room *
          <div className={s.stepper}>
            <button type="button" aria-label="Fewer guests" onClick={() => step("capacity", -1, 12)} disabled={x.capacity <= 1}>
              <Minus size={14} />
            </button>
            <span>{x.capacity}</span>
            <button type="button" aria-label="More guests" onClick={() => step("capacity", 1, 12)} disabled={x.capacity >= 12}>
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className={s.field}>
          Rooms of this type *
          <div className={s.stepper}>
            <button type="button" aria-label="Fewer rooms" onClick={() => step("totalRooms", -1, 200)} disabled={x.totalRooms <= 1}>
              <Minus size={14} />
            </button>
            <span>{x.totalRooms}</span>
            <button type="button" aria-label="More rooms" onClick={() => step("totalRooms", 1, 200)} disabled={x.totalRooms >= 200}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className={s.row}>
        <label className={s.field}>
          Price per night (Rs) *
          <input inputMode="numeric" value={price} placeholder="e.g. 6000" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
          {errors.price ? <small className={s.fieldError}>{errors.price}</small> : null}
        </label>
        <label className={s.field}>
          Cancellation
          <select value={x.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)}>
            {CANCELLATION_POLICIES.map((policy) => (
              <option key={policy}>{policy}</option>
            ))}
          </select>
        </label>
      </div>
      <label className={s.check}>
        <input type="checkbox" checked={x.breakfastIncluded} onChange={(e) => set("breakfastIncluded", e.target.checked)} />
        Breakfast included
      </label>
      <div className={s.field}>
        In the room
        <div className={s.chips}>
          {ROOM_AMENITIES.map((item) => {
            const on = x.amenities.includes(item);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={on}
                className={`${s.chip} ${on ? s.chipOn : ""}`}
                onClick={() => set("amenities", on ? x.amenities.filter((a) => a !== item) : [...x.amenities, item])}
              >
                {on ? <Check size={13} /> : null}
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className={s.field}>
        Photos * <small>(up to 4)</small>
        <div className={s.photos}>
          {Array.from({ length: Math.min(4, x.images.length + 1) }, (_, index) => (
            <PhotoUpload
              key={`${index}-${x.images[index] ?? "new"}`}
              label={index === 0 ? "Main photo" : `Photo ${index + 1}`}
              required={index === 0}
              folder="rooms"
              value={x.images[index]}
              error={index === 0 ? errors.images : undefined}
              onBusyChange={(on) => setUploading((count) => Math.max(0, count + (on ? 1 : -1)))}
              onChange={(url) => {
                const next = [...x.images];
                if (url) next[index] = url;
                else next.splice(index, 1);
                set("images", next.filter(Boolean));
              }}
            />
          ))}
        </div>
      </div>
      <div className={s.formActions}>
        <button type="button" className={s.secondary} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={s.primary} onClick={() => void save()} disabled={saving || uploading > 0}>
          {saving ? <LoaderCircle size={15} className={s.spin} /> : null}
          {uploading > 0 ? "Uploading…" : saving ? "Saving…" : room ? "Save changes" : "Add room"}
        </button>
      </div>
    </div>
  );
}
