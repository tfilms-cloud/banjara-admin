export type Rec = Record<string, unknown>;

const EM_DASH = "—";

export function toRecord(value: unknown): Rec {
  return value !== null && typeof value === "object" ? (value as Rec) : {};
}

export function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => toRecord(acc)[key], value);
}

export function displayValue(value: unknown, fallback = EM_DASH): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value.map((item) => displayValue(item, "")).filter(Boolean);
    return parts.length ? parts.join(", ") : fallback;
  }
  if (typeof value === "object") return refLabel(value, fallback);
  return fallback;
}

export function text(value: unknown, path: string, fallback = EM_DASH): string {
  return displayValue(readPath(value, path), fallback);
}

export function firstText(value: unknown, paths: string[], fallback = EM_DASH): string {
  for (const path of paths) {
    const found = displayValue(readPath(value, path), "");
    if (found) return found;
  }
  return fallback;
}

/** Like `firstText`, but returns `undefined` instead of a placeholder. */
export function optionalText(value: unknown, paths: string[]): string | undefined {
  const found = firstText(value, paths, "");
  return found || undefined;
}

export function numberAt(value: unknown, path: string, fallback = 0): number {
  const found = readPath(value, path);
  if (typeof found === "number" && Number.isFinite(found)) return found;
  if (typeof found === "string" && found.trim() !== "") {
    const parsed = Number(found);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function firstNumber(value: unknown, paths: string[], fallback = 0): number {
  for (const path of paths) {
    const found = readPath(value, path);
    if (typeof found === "number" && Number.isFinite(found)) return found;
    if (typeof found === "string" && found.trim() !== "" && Number.isFinite(Number(found))) {
      return Number(found);
    }
  }
  return fallback;
}

const LABEL_KEYS = [
  "name",
  "businessName",
  "title",
  "fullName",
  "label",
  "email",
  "registrationNumber",
  "bookingNumber",
  "subject",
];

export function refLabel(value: unknown, fallback = EM_DASH): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = toRecord(value);
  for (const key of LABEL_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  const id = record.id ?? record._id;
  if (typeof id === "string" && id) return id;
  return fallback;
}

const HIDDEN_KEYS = new Set(["__v", "password", "passwordHash", "tokens", "id", "_id"]);

export type DetailField = { key: string; label: string; value: string };

export function toTitleCase(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function detailFields(value: unknown, skip: string[] = []): DetailField[] {
  const record = toRecord(value);
  const skipSet = new Set([...HIDDEN_KEYS, ...skip]);
  return Object.keys(record)
    .filter((key) => !skipSet.has(key))
    .map((key) => ({ key, label: toTitleCase(key), value: displayValue(record[key]) }))
    .filter((field) => field.value !== EM_DASH);
}

export function filterByPaths<T>(items: T[], term: string, paths: string[]): T[] {
  const query = term.trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) =>
    paths.some((path) => displayValue(readPath(item, path), "").toLowerCase().includes(query))
  );
}

export function isIsoLike(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}
