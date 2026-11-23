/*
 * Seasonal editions of the website (Christmas, …). A season only adds things on top of the normal site: extra
 * decoration, extra texts and an extra section. Which season is on is set in /admin/settings/season; the artwork and
 * texts per season live in components/functional/seasonal/<season> and core/locale/messages (namespace "seasons").
 * Adding a season: add its id here, its texts under messages.seasons, and its slots in components/functional/seasonal.
 */
export const SEASON_IDS = ["christmas"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

/** Backoffice labels (Dutch, like the rest of the backoffice). */
export const SEASON_LABELS: Record<SeasonId, string> = {
  christmas: "Kerst",
};

/** Set in the backoffice to look at a season before it goes live: only that browser sees it. */
export const SEASON_PREVIEW_COOKIE = "palleys-season-preview";

/** The value of `season` when no season is on. */
export const NO_SEASON = "none";

export const DEFAULT_SEASONAL_SETTINGS = {
  season: NO_SEASON,
  startsOn: null,
  endsOn: null,
  orderDeadline: null,
  addonPrices: {},
} as const;

export function isSeasonId(value: unknown): value is SeasonId {
  return typeof value === "string" && (SEASON_IDS as readonly string[]).includes(value);
}
