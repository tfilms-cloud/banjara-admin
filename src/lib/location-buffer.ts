/**
 * The driver's GPS points waiting to be sent. Mountain roads lose signal for long
 * stretches, so every point is kept in (injected, localStorage-like) storage and sent
 * later: it survives a reload, is capped by dropping the oldest points, and never
 * throws when storage is full, blocked or corrupt.
 */

export type BufferedPoint = {
  lat: number;
  lng: number;
  at: string;
  speed?: number;
  heading?: number;
};

export type BufferStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type LocationBuffer = {
  add(point: BufferedPoint): void;
  /** Up to `max` points, oldest first. They stay in the buffer until `ack`. */
  drain(max?: number): BufferedPoint[];
  /** Removes the `count` points from the last `drain` once the server took them. */
  ack(count: number): void;
  size(): number;
};

function isPoint(value: unknown): value is BufferedPoint {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.at === "string";
}

export function createLocationBuffer({
  storage,
  key,
  maxPoints = 500,
}: {
  storage?: BufferStorage | null;
  key: string;
  maxPoints?: number;
}): LocationBuffer {
  const cap = Math.max(1, Math.floor(maxPoints));
  let points: BufferedPoint[] = load();
  // Oldest points dropped by the cap since the last drain: those were already in the
  // drained batch, so `ack` must not remove that many newer points as well.
  let droppedSinceDrain = 0;

  function load(): BufferedPoint[] {
    try {
      const raw = storage?.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isPoint).slice(-cap) : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      storage?.setItem(key, JSON.stringify(points));
    } catch {
      // Storage full or blocked: keep the points in memory.
    }
  }

  return {
    add(point) {
      if (!isPoint(point)) return;
      points.push(point);
      if (points.length > cap) {
        const extra = points.length - cap;
        points = points.slice(extra);
        droppedSinceDrain += extra;
      }
      save();
    },
    drain(max = cap) {
      droppedSinceDrain = 0;
      return points.slice(0, Math.max(0, Math.floor(max)));
    },
    ack(count) {
      const remove = Math.max(0, Math.floor(count) - droppedSinceDrain);
      droppedSinceDrain = 0;
      if (!remove) return;
      points = points.slice(remove);
      save();
    },
    size() {
      return points.length;
    },
  };
}
