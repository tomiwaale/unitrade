"use client";

import { useState, useEffect } from "react";

export const LOC_CACHE_KEY = "ut_geo_loc";
export const LOC_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface CachedLocation {
  label: string;   // e.g. "Akoka, Lagos"
  suburb: string;  // e.g. "Akoka"
  city: string;    // e.g. "Lagos"
  ts: number;
}

/** Read the GPS-detected location from localStorage (client-side only). */
export function getCachedLocation(): CachedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (Date.now() - parsed.ts > LOC_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** React hook: returns the cached GPS location label, or null if unavailable. */
export function useLocation(): CachedLocation | null {
  const [loc, setLoc] = useState<CachedLocation | null>(null);

  useEffect(() => {
    setLoc(getCachedLocation());
  }, []);

  return loc;
}
