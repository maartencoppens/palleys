import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The legal pages' versions against the local database: publishing, the version history, the audit log, the fallback
 * to the text in the code and the admin route (with the session mocked). The rows this file adds are removed again.
 */

process.env.ADMIN_EMAILS = "admin@palleys.test";

const auth = vi.hoisted(() => ({ session: null as null | { user: { name: string; email: string } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/core/modules/auth/auth", () => ({ auth: { api: { getSession: async () => auth.session } } }));

const { prisma } = await import("@/db/client");
const service = await import("./service");
const { fallbackContent, fallbackVersion } = await import("./fallback");
const { GET, POST } = await import("@/app/api/admin/legal/[document]/route");
const { LEGAL_DOCUMENTS } = await import("@/data/legal");

const ADMIN = { user: { name: "Test Admin Legal", email: "admin@palleys.test" } };
type Content = ReturnType<typeof fallbackContent<"privacy">>;

/** The current privacy text with one paragraph changed, so it differs from what applies. */
function changedPrivacy(text: string): Content {
  const content = structuredClone(fallbackContent("privacy"));
  content.nl.sections[0].blocks[0] = { type: "paragraph", text };
  return content;
}

const ctx = (document: string) => ({ params: Promise.resolve({ document }) });
const post = (document: string, body: unknown) =>
  POST(new Request(`http://localhost/api/admin/legal/${document}`, { method: "POST", body: JSON.stringify(body) }), ctx(document));
const get = (document: string, version: string) =>
  GET(new Request(`http://localhost/api/admin/legal/${document}?version=${encodeURIComponent(version)}`), ctx(document));

// Rows other people published in the local database stay; only this file's go.
async function cleanUp() {
  await prisma.legalDocumentVersion.deleteMany({ where: { publishedBy: ADMIN.user.name } });
  await prisma.adminAuditLog.deleteMany({ where: { actor: ADMIN.user.name } });
}

beforeEach(async () => {
  auth.session = ADMIN;
  await cleanUp();
});

afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe("legal versions", () => {
  it("publishes a new version from today, logs it and serves it as the current one", async () => {
    const before = await service.getCurrentLegalVersion("privacy");
    const published = await service.publishLegalDocument("privacy", changedPrivacy("Eerste test"), ADMIN.user.name, new Date("2026-11-20T10:00:00Z"));

    expect(published.version).toMatch(/^2026-11-20/);
    expect(published.effectiveDate).toBe("2026-11-20");
    expect(published.publishedBy).toBe(ADMIN.user.name);
    expect(published.content.nl.sections[0].blocks[0]).toEqual({ type: "paragraph", text: "Eerste test" });

    const current = await service.getCurrentLegalVersion("privacy");
    expect(current.version).toBe(published.version);

    const log = await prisma.adminAuditLog.findFirst({ where: { actor: ADMIN.user.name, action: service.LEGAL_AUDIT_ACTION } });
    expect(log).toMatchObject({ subject: "privacy", fromValue: before.version, toValue: published.version });

    // The old version stays reachable, and the history lists the new one first and the text in the code last.
    expect((await service.getLegalVersion("privacy", before.version))?.version).toBe(before.version);
    const history = await service.listLegalVersions("privacy");
    expect(history[0].version).toBe(published.version);
    expect(history.at(-1)).toMatchObject({ published: false, version: LEGAL_DOCUMENTS.privacy.fallbackVersion });
  });

  it("numbers a second version the same day and refuses publishing the same text again", async () => {
    const day = new Date("2026-11-21T09:00:00Z");
    const first = await service.publishLegalDocument("privacy", changedPrivacy("Een"), ADMIN.user.name, day);
    const second = await service.publishLegalDocument("privacy", changedPrivacy("Twee"), ADMIN.user.name, day);
    expect(second.version).toBe(`${first.version}-2`);
    await expect(service.publishLegalDocument("privacy", changedPrivacy("Twee"), ADMIN.user.name, day)).rejects.toThrow(
      service.LegalPublishError,
    );
  });

  it("skips a stored version that no longer fits its schema", async () => {
    const valid = await service.publishLegalDocument("privacy", changedPrivacy("Geldig"), ADMIN.user.name, new Date("2026-11-22T09:00:00Z"));
    await prisma.legalDocumentVersion.create({
      data: { document: "PRIVACY", version: "2026-11-23", effectiveDate: new Date("2026-11-23"), content: { nl: "kapot" }, publishedBy: ADMIN.user.name },
    });
    expect((await service.getCurrentLegalVersion("privacy")).version).toBe(valid.version);
  });

  it("lets the checkout record the terms version that applies", async () => {
    const terms = structuredClone(fallbackContent("terms"));
    terms.en.title = "Terms (test)";
    const published = await service.publishLegalDocument("terms", terms, ADMIN.user.name, new Date("2026-11-24T09:00:00Z"));
    expect(await service.getCurrentTermsVersion()).toBe(published.version);
  });

  it("shows an older version on the site when asked, and the current one for an unknown name", async () => {
    const older = await service.publishLegalDocument("privacy", changedPrivacy("Oud"), ADMIN.user.name, new Date("2026-11-25T09:00:00Z"));
    const newer = await service.publishLegalDocument("privacy", changedPrivacy("Nieuw"), ADMIN.user.name, new Date("2026-11-26T09:00:00Z"));

    const asked = await service.getSiteLegalDocument("privacy", older.version);
    expect(asked.shown.version).toBe(older.version);
    expect(asked.current.version).toBe(newer.version);
    expect((await service.getSiteLegalDocument("privacy", "bestaat-niet")).shown.version).toBe(newer.version);
  });

  it("falls back to the text in the code without a published version", async () => {
    const published = await prisma.legalDocumentVersion.count({ where: { document: "CONTACT" } });
    if (published > 0) return; // someone published contact details in this local database
    expect(await service.getCurrentLegalVersion("contact")).toEqual(fallbackVersion("contact"));
  });
});

describe("/api/admin/legal/[document]", () => {
  it("needs an admin", async () => {
    auth.session = null;
    expect((await post("privacy", { content: changedPrivacy("x") })).status).toBe(401);
    expect((await get("privacy", "2026-11-09")).status).toBe(401);
  });

  it("publishes, and reads a version back", async () => {
    const response = await post("privacy", { content: changedPrivacy("Via de route") });
    expect(response.status).toBe(201);
    const { version } = await response.json();
    expect(version.publishedBy).toBe(ADMIN.user.name);

    const read = await get("privacy", version.version);
    expect(read.status).toBe(200);
    expect((await read.json()).version.content.nl.sections[0].blocks[0].text).toBe("Via de route");
  });

  it("refuses an unknown placeholder, an unknown document and nothing new", async () => {
    const response = await post("privacy", { content: changedPrivacy("Mail {deliveryPrices}") });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("{deliveryPrices}");

    expect((await post("cookies", { content: {} })).status).toBe(404);
    expect((await get("privacy", "bestaat-niet")).status).toBe(404);

    const current = await service.getCurrentLegalVersion("privacy");
    expect((await post("privacy", { content: current.content })).status).toBe(409);
  });
});
