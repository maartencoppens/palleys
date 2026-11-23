import type { SeasonId } from "@/data/seasons";

/** The season the website shows right now, with what its texts need. */
export type ActiveSeason = {
  id: SeasonId;
  /** Last day to order for delivery before the holiday ("2026-12-14"), or null when not set. */
  orderDeadline: string | null;
  /** True when it's only shown because of the backoffice preview cookie. */
  preview: boolean;
};
