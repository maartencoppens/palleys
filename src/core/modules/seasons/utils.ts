import type { SeasonalSettings } from "@/core/modules/settings/types";
import { isSeasonId, NO_SEASON } from "@/data/seasons";
import type { ActiveSeason } from "./types";

// Seasons start and end on Belgian calendar days, whatever the server's time zone.
const belgianDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" });

/** Today in Belgium as "2026-12-14", the same format as the dates in the settings. */
export function todayInBelgium(now: Date = new Date()): string {
  return belgianDay.format(now);
}

/**
 * Which season is on: the one selected in the settings, between its start and end day (both included). A preview
 * (the backoffice cookie) shows a season before it's live; it never hides one that is live.
 */
export function activeSeason(
  settings: Pick<SeasonalSettings, "season" | "startsOn" | "endsOn" | "orderDeadline">,
  now: Date = new Date(),
  previewSeason?: string,
): ActiveSeason | null {
  const today = todayInBelgium(now);
  const live =
    settings.season !== NO_SEASON &&
    (!settings.startsOn || today >= settings.startsOn) &&
    (!settings.endsOn || today <= settings.endsOn);
  if (live && isSeasonId(settings.season)) {
    return { id: settings.season, orderDeadline: settings.orderDeadline, preview: false };
  }
  if (isSeasonId(previewSeason)) {
    return { id: previewSeason, orderDeadline: settings.orderDeadline, preview: true };
  }
  return null;
}

/** The order deadline only while it's still ahead: after it, the texts that promise delivery in time are left out. */
export function upcomingDeadline(season: ActiveSeason, now: Date = new Date()): string | null {
  return season.orderDeadline && season.orderDeadline >= todayInBelgium(now) ? season.orderDeadline : null;
}
