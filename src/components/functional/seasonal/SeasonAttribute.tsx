"use client";

import { useLayoutEffect } from "react";
import type { SeasonId } from "@/data/seasons";

/**
 * Puts data-season on <html>, which turns on the `christmas:` CSS variant (globals.css) for the small seasonal touches
 * inside client components (like the Santa hat on the logo). Removed again when the season ends or the page changes.
 */
export function SeasonAttribute({ season }: { season: SeasonId }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.season = season;
    return () => {
      delete document.documentElement.dataset.season;
    };
  }, [season]);
  return null;
}
