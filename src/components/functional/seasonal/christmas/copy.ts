import "server-only";
import { getLocale, getMessages } from "@/core/locale/server";
import { upcomingDeadline } from "@/core/modules/seasons/utils";
import type { ActiveSeason } from "@/core/modules/seasons/types";
import { formatDay } from "@/core/utils/format";

/** The Christmas texts in the visitor's language, with the order deadline as a date ("14 december 2026") while it's ahead. */
export async function christmasCopy(season: ActiveSeason) {
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  const deadline = upcomingDeadline(season);
  return { m: messages.seasons.christmas, date: deadline ? formatDay(deadline, locale) : null };
}
