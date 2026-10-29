import type { Filters } from "../types/api";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export class ApiError extends Error {}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") q.set(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function getJson<T>(path: string, params: Record<string, string | number | undefined | null> = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try { res = await fetch(`${BASE}${path}${buildQuery(params)}`, { signal }); }
  catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(`Cannot reach the API at ${BASE}. Is the backend running?`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { const b = await res.json(); if (typeof b.detail === "string") detail = b.detail; } catch { /* keep statusText */ }
    throw new ApiError(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const filterParams = (f: Filters) => ({ plan: f.plan, region: f.region, age_group: f.age_group, smoker: f.smoker });
