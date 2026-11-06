"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { RoomEditor } from "@/components/lodging/room-editor";
import { useQuery } from "@/lib/live-query";
import { getMyHotel } from "@/services/customer/lodging.service";
import { AuthShell } from "./auth-shell";
import { AuthBanner } from "./auth-fields";
import { LodgingGate, lodgingCaption, lodgingStep, useLodgingStep } from "./lodging-shared";
import styles from "./auth.module.css";

const TITLE = "Your rooms";

/** Lodging step 7: each type of room, its price per night and how many there are. */
export function LodgingRooms() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, ready, error } = useLodgingStep("rooms");
  const hotel = useQuery({ queryKey: ["provider", "my-hotel"], queryFn: getMyHotel, enabled: ready });
  const [roomCount, setRoomCount] = useState<number | null>(null);

  if (error || hotel.isError) return <LodgingGate step="rooms" title={TITLE} error={error ?? hotel.error} />;
  if (!ready || !profile || hotel.isPending) return <LodgingGate step="rooms" title={TITLE} />;
  if (!hotel.data) {
    return (
      <LodgingGate step="rooms" title={TITLE}>
        <AuthBanner>
          Your property listing isn’t ready yet. Go back to Property details and save them again.
        </AuthBanner>
      </LodgingGate>
    );
  }
  const count = roomCount ?? profile.progress?.rooms ?? 0;

  return (
    <AuthShell
      wide
      caption={lodgingCaption("rooms")}
      title={TITLE}
      step={lodgingStep("rooms")}
      subtitle="Add each type of room you rent — for example “Double with mountain view” — with its price per night. You can change these any time after approval."
      backHref="/"
      backLabel="Finish later"
    >
      <div className={styles.form}>
        <RoomEditor hotelId={hotel.data.id} onChange={(rooms) => setRoomCount(rooms.length)} />
        <button
          type="button"
          className={styles.primary}
          disabled={count < 1}
          onClick={async () => {
            await queryClient.invalidateQueries({ queryKey: ["provider"] });
            router.push("/provider-application/review");
          }}
        >
          {count < 1 ? "Add at least one room to continue" : "Continue to review"}
          {count < 1 ? null : <ArrowRight size={16} />}
        </button>
      </div>
    </AuthShell>
  );
}
