import type { ApiSuccess } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export async function serverGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "")
        url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json" },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const json = (await response.json()) as ApiSuccess<T>;
  return json.data;
}
