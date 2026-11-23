import { describe, expect, it } from "vitest";
import { activeSeason, todayInBelgium, upcomingDeadline } from "./utils";

const settings = { season: "christmas", startsOn: "2026-11-25", endsOn: "2027-01-06", orderDeadline: "2026-12-14" } as const;
const at = (iso: string) => new Date(iso);

describe("seasons", () => {
  it("is on between its start and end day, both included, in Belgian time", () => {
    expect(activeSeason(settings, at("2026-11-24T22:59:00Z"))).toBeNull(); // 23:59 in Brussels
    expect(activeSeason(settings, at("2026-11-24T23:00:00Z"))?.id).toBe("christmas"); // midnight in Brussels
    expect(activeSeason(settings, at("2027-01-06T12:00:00Z"))?.id).toBe("christmas");
    expect(activeSeason(settings, at("2027-01-06T23:00:00Z"))).toBeNull();
  });

  it("is on without dates as long as it's selected, and off with no season", () => {
    expect(activeSeason({ ...settings, startsOn: null, endsOn: null }, at("2026-06-01T12:00:00Z"))?.id).toBe("christmas");
    expect(activeSeason({ ...settings, season: "none" }, at("2026-12-01T12:00:00Z"))).toBeNull();
  });

  it("shows a preview before it's live, and ignores an unknown preview value", () => {
    expect(activeSeason({ ...settings, season: "none" }, at("2026-10-01T12:00:00Z"), "christmas")).toMatchObject({
      id: "christmas",
      preview: true,
    });
    expect(activeSeason({ ...settings, season: "none" }, at("2026-10-01T12:00:00Z"), "easter")).toBeNull();
  });

  it("only mentions the order deadline while it's ahead", () => {
    const season = activeSeason(settings, at("2026-12-01T12:00:00Z"))!;
    expect(upcomingDeadline(season, at("2026-12-14T20:00:00Z"))).toBe("2026-12-14");
    expect(upcomingDeadline(season, at("2026-12-15T08:00:00Z"))).toBeNull();
    expect(todayInBelgium(at("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
