import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getSiteSettings } from "@/core/modules/settings/service";
import { SEASON_PREVIEW_COOKIE } from "@/data/seasons";
import type { ActiveSeason } from "./types";
import { activeSeason } from "./utils";

/**
 * The season the visitor sees, once per request. Reads the settings and the preview cookie, so it makes the part of
 * the page that calls it dynamic: call it inside a Suspense boundary (components/functional/seasonal/Seasonal.tsx).
 */
export const getActiveSeason = cache(async (): Promise<ActiveSeason | null> => {
  const [settings, cookieStore] = await Promise.all([getSiteSettings(), cookies()]);
  return activeSeason(settings.seasonal, new Date(), cookieStore.get(SEASON_PREVIEW_COOKIE)?.value);
});
