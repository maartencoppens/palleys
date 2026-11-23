import { describe, expect, it } from "vitest";
import { orderComments, palleyComments } from "./comments";

const at = (iso: string) => new Date(iso);
const shopOrder = { createdBy: null, paidAt: at("2026-12-01T10:00:00Z"), createdAt: at("2026-12-01T09:55:00Z") };

describe("comments on a Palley for post-production", () => {
  it("lists the customer's note and the model's reasons, oldest first", () => {
    const comments = palleyComments(
      {
        notes: " Graag het vlekje op zijn neus ",
        preview: {
          statusChanges: [
            { reason: "In Blender (Processed): oor bijgewerkt", changedBy: "Joran", createdAt: at("2026-12-03T12:00:00Z"), toStatus: "PRINT_READY" },
            { reason: "  ", changedBy: "Joran", createdAt: at("2026-12-02T12:00:00Z"), toStatus: "APPROVED" },
          ],
        },
      },
      shopOrder,
    );
    expect(comments.map((comment) => [comment.label, comment.text, comment.by])).toEqual([
      ["Klant", "Graag het vlekje op zijn neus", null],
      ["Model", "In Blender (Processed): oor bijgewerkt", "Joran"],
    ]);
  });

  it("calls the note the team's on an order an admin added", () => {
    const [comment] = palleyComments({ notes: "Voor de beurs", preview: null }, { ...shopOrder, createdBy: "Maarten" });
    expect(comment).toMatchObject({ source: "team", label: "Bij het aanmaken (backoffice)", by: "Maarten" });
  });

  it("keeps the order's notepad and typed reasons, not the automatic log", () => {
    const comments = orderComments({
      ...shopOrder,
      adminNotes: "Haalt af als @pixel.de.kat",
      adminNotesUpdatedBy: "Bavo",
      adminNotesUpdatedAt: at("2026-12-04T08:00:00Z"),
      statusChanges: [
        { note: "In BTC-0007 gezet", source: "admin:Maarten", createdAt: at("2026-12-02T08:00:00Z") },
        { note: "Probleem afgehandeld: adres nagevraagd (was: adres onvolledig)", source: "admin:Reinhart", createdAt: at("2026-12-03T08:00:00Z") },
        { note: "Probleem afgehandeld: door het systeem", source: "cron", createdAt: at("2026-12-03T09:00:00Z") },
      ],
    });
    expect(comments.map((comment) => [comment.label, comment.by])).toEqual([
      ["Orderlog", "Reinhart"],
      ["Teamnotitie", "Bavo"],
    ]);
  });
});
