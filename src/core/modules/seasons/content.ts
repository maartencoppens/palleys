import "server-only";
import { getLocale, getMessages } from "@/core/locale/server";
import { fill } from "@/core/locale/fill";
import type { SiteContent } from "@/core/modules/settings/types";
import { formatDay } from "@/core/utils/format";
import { getActiveSeason } from "./service";
import { upcomingDeadline } from "./utils";

export type SeasonalExtras = {
  /** Added after the info banner messages from the settings. */
  bannerMessages: string[];
  /** Added before the FAQ from the settings. */
  faq: SiteContent["faq"];
};

const NOTHING: SeasonalExtras = { bannerMessages: [], faq: [] };

/**
 * Texts the active season adds to lists that come from the settings (info banner, FAQ). Nothing when no season is on,
 * so those lists stay exactly as the admin set them. Dynamic, like getActiveSeason: call it inside a Suspense boundary.
 */
export async function getSeasonalExtras(): Promise<SeasonalExtras> {
  const season = await getActiveSeason();
  if (!season) return NOTHING;
  const [messages, locale] = await Promise.all([getMessages(), getLocale()]);
  const deadline = upcomingDeadline(season);
  const date = deadline ? formatDay(deadline, locale) : null;

  switch (season.id) {
    case "christmas": {
      const m = messages.seasons.christmas;
      return {
        bannerMessages: [m.bannerNew, ...(date ? [fill(m.bannerDeadline, { date })] : [])],
        faq: [{ question: m.faqQuestion, answer: date ? fill(m.faqAnswer, { date }) : m.faqAnswerNoDeadline }],
      };
    }
  }
}
