import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * /retour over our own code, against the local database, with R2 and Resend mocked: looking an order up, the one-time
 * link and its session, the requests a customer may send, and how the team approves, rejects and completes them. Also
 * the moment a Palley op maat goes into production (its pose approved), which ends free cancelling.
 */

const storage = vi.hoisted(() => ({ missing: new Set<string>() }));

vi.mock("@/core/networking/external/storage-client", () => ({
  objectExists: async (key: string) => !storage.missing.has(key),
  createDownloadUrl: async (key: string) => `https://r2.test/${key}`,
  createUploadUrl: async (key: string) => `https://r2.test/upload/${key}`,
  putObject: async () => undefined,
  deleteObject: async () => undefined,
  getObject: async () => Buffer.from(""),
}));

const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text: string }[] }));

vi.mock("@/core/networking/external/email-client", () => ({
  EmailError: class extends Error {},
  isEmailConfigured: () => true,
  sendEmail: async (message: { to: string; subject: string; text: string }) => {
    mail.sent.push(message);
    return true;
  },
}));

vi.mock("@/core/networking/external/meshy-client", () => ({
  MeshyError: class extends Error {},
  createImageTo3dTask: async () => `task-${randomUUID()}`,
}));

const { prisma } = await import("@/db/client");
const { startModelGeneration } = await import("@/core/modules/previews/service");
const { createManualOrder, setItemCheckIn } = await import("@/core/modules/orders/admin");
const { manualOrderSchema } = await import("@/core/modules/orders/types");
const { palleyNameOf } = await import("@/core/modules/orders/utils");
const {
  createReturnPhotoUploads,
  decideReturnRequest,
  getReturnOverview,
  openReturnSession,
  requestReturnLink,
  ReturnAccessError,
  ReturnNotAllowedError,
  ReturnPhotoError,
  setDeliveredOn,
  submitReturnRequest,
} = await import("./service");
const { returnLookupSchema, returnSubmitSchema } = await import("./types");
const { brusselsDay, addDays } = await import("./utils");

const ADMIN = "Test Admin";
const createdOrders = new Set<string>();
const createdCollectibles: string[] = [];

async function newCollectible() {
  const suffix = randomUUID().slice(0, 8);
  const row = await prisma.collectible.create({
    data: { slug: `retour-test-${suffix}`, name: `Retourmodel ${suffix}`, priceCents: 1500, published: true },
  });
  createdCollectibles.push(row.id);
  return row.id;
}

/** A paid order (by hand, so no Stripe) with one Palley op maat and two collectibles. */
async function paidOrder({ email = `klant-${randomUUID().slice(0, 8)}@example.be`, delivery = { type: "handover" } as object } = {}) {
  const collectibleId = await newCollectible();
  const input = manualOrderSchema.parse({
    customer: { firstName: "Jan", lastName: "Retour", email },
    lines: [
      { kind: "personalized", animal: "dog", edition: "keychain", quantity: 1 },
      { kind: "collectible", collectibleId, quantity: 2 },
    ],
    delivery,
    payment: { type: "paid", method: "cash" },
    sendConfirmation: false,
  });
  const { orderId, number } = await createManualOrder(input, ADMIN);
  createdOrders.add(orderId);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { orderBy: { position: "asc" } } } });
  const [custom, collectible] = order.items;
  return { orderId, number, email, custom, collectible };
}

/** What the mail link would do: ask for a link, take the token out of the mail, open a session with it. */
async function sessionFor(order: { number: string; email: string }) {
  mail.sent.length = 0;
  await requestReturnLink(returnLookupSchema.parse({ orderNumber: order.number, email: order.email }));
  const link = mail.sent.find((message) => message.text.includes("#t="));
  if (!link) throw new Error("no link mailed");
  const token = link.text.match(/#t=([\w-]+)/)![1];
  mail.sent.length = 0;
  return { token, ...(await openReturnSession(token, "nl")) };
}

const markShipped = (orderId: string, shippedAt: Date) =>
  prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED", shipment: { update: { shippedAt } } } });

const submit = (session: string, input: unknown) => submitReturnRequest(session, returnSubmitSchema.parse(input), "nl");

beforeEach(() => {
  mail.sent.length = 0;
  storage.missing.clear();
});

afterAll(async () => {
  const reprints = await prisma.order.findMany({ where: { reprintOfId: { in: [...createdOrders] } }, select: { id: true } });
  const ids = [...reprints.map((order) => order.id), ...createdOrders];
  const items = await prisma.orderItem.findMany({ where: { orderId: { in: ids } }, select: { previewId: true } });
  await prisma.returnRequest.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.returnAccess.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderStatusChange.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: reprints.map((order) => order.id) } } });
  await prisma.order.deleteMany({ where: { id: { in: [...createdOrders] } } });
  await prisma.preview.deleteMany({ where: { id: { in: items.flatMap((item) => item.previewId ?? []) } } });
  await prisma.collectible.deleteMany({ where: { id: { in: createdCollectibles } } });
  await prisma.$disconnect();
});

describe("looking up an order", () => {
  it("mails a one-time link to the order's own address, whatever the case of the e-mail", async () => {
    const order = await paidOrder();
    await requestReturnLink(returnLookupSchema.parse({ orderNumber: ` ${order.number.toLowerCase()} `, email: order.email.toUpperCase() }));
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe(order.email);
    const access = await prisma.returnAccess.findMany({ where: { orderId: order.orderId } });
    expect(access).toHaveLength(1);
    // Only the hash is stored.
    expect(mail.sent[0].text).not.toContain(access[0].linkTokenHash);
  });

  it("sends nothing for a wrong address or an unpaid order", async () => {
    const order = await paidOrder();
    await requestReturnLink(returnLookupSchema.parse({ orderNumber: order.number, email: "iemand-anders@example.be" }));
    await prisma.order.update({ where: { id: order.orderId }, data: { status: "EXPIRED" } });
    await requestReturnLink(returnLookupSchema.parse({ orderNumber: order.number, email: order.email }));
    await requestReturnLink(returnLookupSchema.parse({ orderNumber: "PLY999999", email: order.email }));
    expect(mail.sent).toHaveLength(0);
  });

  it("stops mailing after a few lookups of the same number, without saying so", async () => {
    const order = await paidOrder();
    for (let i = 0; i < 5; i++) await requestReturnLink(returnLookupSchema.parse({ orderNumber: order.number, email: order.email }));
    expect(mail.sent).toHaveLength(3);
  });

  it("refuses an order number in the wrong format before looking anything up", () => {
    expect(returnLookupSchema.safeParse({ orderNumber: "12345", email: "a@b.be" }).success).toBe(false);
  });
});

describe("the link and its session", () => {
  it("works once", async () => {
    const order = await paidOrder();
    const { token, sessionToken, overview } = await sessionFor(order);
    expect(overview.orderNumber).toBe(order.number);
    await expect(openReturnSession(token, "nl")).rejects.toBeInstanceOf(ReturnAccessError);
    expect((await getReturnOverview(sessionToken, "nl")).items).toHaveLength(2);
  });

  it("expires", async () => {
    const order = await paidOrder();
    mail.sent.length = 0;
    await requestReturnLink(returnLookupSchema.parse({ orderNumber: order.number, email: order.email }));
    const token = mail.sent[0].text.match(/#t=([\w-]+)/)![1];
    await prisma.returnAccess.updateMany({ where: { orderId: order.orderId }, data: { linkExpiresAt: new Date(Date.now() - 1000) } });
    await expect(openReturnSession(token, "nl")).rejects.toBeInstanceOf(ReturnAccessError);
  });

  it("lets nothing in without a valid session", async () => {
    await expect(getReturnOverview(null, "nl")).rejects.toBeInstanceOf(ReturnAccessError);
    await expect(getReturnOverview("x".repeat(43), "nl")).rejects.toBeInstanceOf(ReturnAccessError);
  });
});

describe("before the order leaves", () => {
  it("offers cancelling the Palley op maat and withdrawing the collectibles", async () => {
    const order = await paidOrder();
    const { overview } = await sessionFor(order);
    const [custom, collectible] = overview.items;
    expect(custom).toMatchObject({ kind: "personalized", status: "paid" });
    expect(custom.options).toMatchObject({ cancel: 1, withdraw: 0, warranty: 0 });
    expect(collectible.options).toMatchObject({ cancel: 0, withdraw: 2, warranty: 0, withdrawalReceived: false });
  });

  it("withdraws part of the collectibles: receipt, attention flag, log and mails; approving takes them out of production", async () => {
    const order = await paidOrder();
    const { sessionToken } = await sessionFor(order);
    const receipt = await submit(sessionToken, { type: "WITHDRAWAL", items: [{ orderItemId: order.collectible.id, quantity: 1 }] });
    expect(receipt).toMatchObject({ type: "WITHDRAWAL", itemsReceived: false, returnBy: null });
    expect(receipt.items[0].quantity).toBe(1);

    const flagged = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId }, include: { statusChanges: true } });
    expect(flagged.attentionReason).toContain("Retouraanvraag");
    expect(flagged.statusChanges.some((change) => change.source === "customer" && change.note?.startsWith("Herroeping aangevraagd"))).toBe(true);
    expect(mail.sent.map((message) => message.subject)).toEqual(
      expect.arrayContaining([`Ontvangstbevestiging: herroeping voor bestelling ${order.number}`, `Herroeping voor ${order.number}`]),
    );

    // The same copy can't be asked for twice, the other one still can.
    await expect(submit(sessionToken, { type: "WITHDRAWAL", items: [{ orderItemId: order.collectible.id, quantity: 2 }] })).rejects.toBeInstanceOf(
      ReturnNotAllowedError,
    );

    await decideReturnRequest(receipt.id, { action: "approve" }, ADMIN);
    const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: order.collectible.id } });
    expect(item.cancelledQuantity).toBe(1);
    expect(mail.sent.at(-1)?.subject).toContain("goedgekeurd");

    await decideReturnRequest(receipt.id, { action: "complete" }, ADMIN);
    const done = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } });
    expect(done.attentionReason).toBeNull();
    await expect(decideReturnRequest(receipt.id, { action: "approve" }, ADMIN)).rejects.toThrow("Deze stap kan niet");
  });

  it("cancels the Palley op maat; the rest of the order can still be checked in and shipped", async () => {
    const order = await paidOrder();
    const { sessionToken } = await sessionFor(order);
    const receipt = await submit(sessionToken, { type: "CANCELLATION", items: [{ orderItemId: order.custom.id, quantity: 1 }], reason: "Toch niet" });
    await decideReturnRequest(receipt.id, { action: "approve" }, ADMIN);

    await expect(setItemCheckIn(order.orderId, order.custom.id, true, ADMIN)).rejects.toThrow("geannuleerd");
    await setItemCheckIn(order.orderId, order.collectible.id, true, ADMIN);
    const { updateOrderStatus } = await import("@/core/modules/orders/admin");
    await updateOrderStatus(order.orderId, { status: "SHIPPED" }, ADMIN);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } })).status).toBe("SHIPPED");
  });

  it("no longer offers cancelling once the order is in production", async () => {
    const order = await paidOrder();
    await prisma.order.update({ where: { id: order.orderId }, data: { status: "IN_PRODUCTION" } });
    const { sessionToken, overview } = await sessionFor(order);
    expect(overview.items[0].options.notices).toContain("custom_no_withdrawal");
    await expect(submit(sessionToken, { type: "CANCELLATION", items: [{ orderItemId: order.custom.id, quantity: 1 }] })).rejects.toBeInstanceOf(
      ReturnNotAllowedError,
    );
  });

  it("sends the rejection reason to the customer", async () => {
    const order = await paidOrder();
    const { sessionToken } = await sessionFor(order);
    const receipt = await submit(sessionToken, { type: "WITHDRAWAL", items: [{ orderItemId: order.collectible.id, quantity: 2 }] });
    await decideReturnRequest(receipt.id, { action: "reject", note: "Al eerder terugbetaald" }, ADMIN);
    expect(mail.sent.at(-1)?.text).toContain("Al eerder terugbetaald");
    // Rejected: the copies can be asked for again.
    expect((await getReturnOverview(sessionToken, "nl")).items[1].options.withdraw).toBe(2);
  });
});

describe("after the order left", () => {
  it("withdraws a received collectible within 14 days, with return instructions", async () => {
    const order = await paidOrder({ delivery: { type: "ship", optionId: "be-postnl-home", street: "Teststraat", houseNumber: "1", postalCode: "9000", city: "Gent" } });
    await markShipped(order.orderId, new Date());
    const { sessionToken, overview } = await sessionFor(order);
    expect(overview.receivedOn?.estimated).toBe(true);
    const receipt = await submit(sessionToken, { type: "WITHDRAWAL", items: [{ orderItemId: order.collectible.id, quantity: 2 }] });
    expect(receipt.itemsReceived).toBe(true);
    expect(receipt.returnBy).toBe(addDays(brusselsDay(new Date()), 14));
    expect(mail.sent[0].text).toContain("Stuur de Palleys ongebruikt");

    // Approving doesn't stop production: they were already made and sent.
    await decideReturnRequest(receipt.id, { action: "approve" }, ADMIN);
    expect((await prisma.orderItem.findUniqueOrThrow({ where: { id: order.collectible.id } })).cancelledQuantity).toBe(0);
  });

  it("closes the withdrawal period after the 14th day, counted from the date the team filled in", async () => {
    const order = await paidOrder({ delivery: { type: "ship", optionId: "be-postnl-home", street: "Teststraat", houseNumber: "1", postalCode: "9000", city: "Gent" } });
    await markShipped(order.orderId, new Date(Date.now() - 40 * 24 * 60 * 60 * 1000));
    await setDeliveredOn(order.orderId, addDays(brusselsDay(new Date()), -15), ADMIN);
    const { sessionToken, overview } = await sessionFor(order);
    expect(overview.receivedOn?.estimated).toBe(false);
    expect(overview.items[1].options.notices).toContain("withdrawal_expired");
    await expect(submit(sessionToken, { type: "WITHDRAWAL", items: [{ orderItemId: order.collectible.id, quantity: 1 }] })).rejects.toBeInstanceOf(
      ReturnNotAllowedError,
    );

    await setDeliveredOn(order.orderId, addDays(brusselsDay(new Date()), -14), ADMIN);
    expect((await getReturnOverview(sessionToken, "nl")).items[1].options.withdraw).toBe(2);
  });

  it("takes a warranty claim only with the order's own uploaded photos", async () => {
    const order = await paidOrder();
    await markShipped(order.orderId, new Date());
    const { sessionToken } = await sessionFor(order);
    const [upload] = await createReturnPhotoUploads(sessionToken, { photos: [{ contentType: "image/jpeg", size: 1000 }] });
    expect(upload.key).toMatch(new RegExp(`^returns/${order.orderId}/`));
    const claim = { type: "WARRANTY", items: [{ orderItemId: order.custom.id, quantity: 1 }], reason: "Het oortje is afgebroken", resolution: "REPRINT" };

    await expect(submit(sessionToken, { ...claim, photoKeys: [`returns/${randomUUID()}/${randomUUID()}.jpg`] })).rejects.toBeInstanceOf(ReturnPhotoError);
    storage.missing.add(upload.key);
    await expect(submit(sessionToken, { ...claim, photoKeys: [upload.key] })).rejects.toBeInstanceOf(ReturnPhotoError);
    storage.missing.clear();
    const receipt = await submit(sessionToken, { ...claim, photoKeys: [upload.key] });
    expect(receipt).toMatchObject({ type: "WARRANTY", resolution: "REPRINT", photoCount: 1 });
  });

  it("approving a reprint makes a € 0 order for the next batch, named after the first order", async () => {
    const order = await paidOrder();
    await markShipped(order.orderId, new Date());
    const { sessionToken } = await sessionFor(order);
    const [upload] = await createReturnPhotoUploads(sessionToken, { photos: [{ contentType: "image/png", size: 1000 }] });
    const claim = { type: "WARRANTY", reason: "Verkeerde kleur geprint", resolution: "REPRINT", photoKeys: [upload.key] };
    const receipt = await submit(sessionToken, { ...claim, items: [{ orderItemId: order.custom.id, quantity: 1 }] });

    const { reprintOrder } = await decideReturnRequest(receipt.id, { action: "approve" }, ADMIN);
    const reprint = await prisma.order.findUniqueOrThrow({
      where: { id: reprintOrder!.id },
      include: { items: true, shipment: true, reprintOf: { select: { number: true } } },
    });
    expect(reprint).toMatchObject({ status: "PAID", totalCents: 0, invoiceNumber: null, reprintOfId: order.orderId, createdBy: ADMIN });
    expect(reprint.items).toHaveLength(1);
    expect(reprint.items[0]).toMatchObject({ previewId: order.custom.previewId, position: order.custom.position, reprintNr: 1, unitCents: 0 });
    expect(reprint.shipment?.priceCents).toBe(0);
    expect(palleyNameOf({ ...reprint.items[0], order: reprint })).toBe(
      palleyNameOf({ ...order.custom, order: { number: order.number, reprintOf: null } }) + "-R1",
    );

    // A claim on the reprint itself gets the next number, still under the first order.
    await decideReturnRequest(receipt.id, { action: "complete" }, ADMIN);
    await markShipped(reprint.id, new Date());
    const second = await sessionFor({ number: reprint.number, email: order.email });
    const [secondUpload] = await createReturnPhotoUploads(second.sessionToken, { photos: [{ contentType: "image/png", size: 1000 }] });
    const again = await submit(second.sessionToken, { ...claim, photoKeys: [secondUpload.key], items: [{ orderItemId: reprint.items[0].id, quantity: 1 }] });
    const { reprintOrder: third } = await decideReturnRequest(again.id, { action: "approve" }, ADMIN);
    const thirdOrder = await prisma.order.findUniqueOrThrow({ where: { id: third!.id }, include: { items: true } });
    expect(thirdOrder.reprintOfId).toBe(order.orderId);
    expect(thirdOrder.items[0].reprintNr).toBe(2);
  });
});

describe("approving the pose", () => {
  /** The pose of the order's Palley op maat is ready, and the customer got the confirmation mail. */
  async function poseReady(order: Awaited<ReturnType<typeof paidOrder>>) {
    await prisma.preview.update({ where: { id: order.custom.previewId! }, data: { status: "POSE_READY", poseImageKey: `previews/${order.custom.previewId}/pose.png` } });
    await prisma.order.update({ where: { id: order.orderId }, data: { confirmationSentAt: new Date() } });
  }

  it("puts the order in production and mails the customer once, however often the model is made", async () => {
    const order = await paidOrder();
    await poseReady(order);
    await startModelGeneration(order.custom.previewId!, ADMIN);

    const started = await prisma.order.findUniqueOrThrow({ where: { id: order.orderId }, include: { statusChanges: true } });
    expect(started.productionStartedAt).not.toBeNull();
    expect(started.status).toBe("PAID");
    expect(started.statusChanges.some((change) => change.note?.startsWith("In productie: pose goedgekeurd"))).toBe(true);
    expect(mail.sent.filter((message) => message.subject === `Je bestelling ${order.number} is in productie`)).toHaveLength(1);

    // Generating the model again (back to the pose first) sends nothing new.
    await prisma.preview.update({ where: { id: order.custom.previewId! }, data: { status: "POSE_READY" } });
    await startModelGeneration(order.custom.previewId!, ADMIN);
    expect(mail.sent.filter((message) => message.subject.includes("in productie"))).toHaveLength(1);
  });

  it("ends free cancelling of the Palley op maat; the collectibles can still be withdrawn", async () => {
    const order = await paidOrder();
    await poseReady(order);
    await startModelGeneration(order.custom.previewId!, ADMIN);
    const { sessionToken, overview } = await sessionFor(order);
    expect(overview.items[0]).toMatchObject({ status: "in_production", options: { cancel: 0 } });
    expect(overview.items[0].options.notices).toContain("custom_no_withdrawal");
    expect(overview.items[1].options.withdraw).toBe(2);
    await expect(submit(sessionToken, { type: "CANCELLATION", items: [{ orderItemId: order.custom.id, quantity: 1 }] })).rejects.toBeInstanceOf(
      ReturnNotAllowedError,
    );
  });

  it("mails nobody for an order added without a confirmation mail", async () => {
    const order = await paidOrder();
    await poseReady(order);
    await prisma.order.update({ where: { id: order.orderId }, data: { confirmationSentAt: null } });
    mail.sent.length = 0;
    await startModelGeneration(order.custom.previewId!, ADMIN);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } })).productionStartedAt).not.toBeNull();
    expect(mail.sent).toHaveLength(0);
  });

  it("waits while the customer asked to cancel that Palley", async () => {
    const order = await paidOrder();
    const { sessionToken } = await sessionFor(order);
    await submit(sessionToken, { type: "CANCELLATION", items: [{ orderItemId: order.custom.id, quantity: 1 }] });
    await poseReady(order);
    await expect(startModelGeneration(order.custom.previewId!, ADMIN)).rejects.toThrow("annulering");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.orderId } })).productionStartedAt).toBeNull();
  });
});
