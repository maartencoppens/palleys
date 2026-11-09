import { describe, expect, it } from "vitest";
import { buildNewOrderTeamMail, buildOrderConfirmation, buildProductionMail, type ConfirmationOrder } from "./emails";

const order: ConfirmationOrder = {
  number: "PLY1001",
  firstName: "Emma",
  lastName: "Peeters",
  street: "Straat",
  houseNumber: "1",
  postalCode: "9000",
  city: "Gent",
  country: "BE",
  subtotalCents: 2799,
  discountCents: 0,
  discountCode: null,
  shippingCents: 495,
  totalCents: 3294,
  locale: "nl",
  termsVersion: "v1",
  items: [
    {
      title: "Palley Hond · Met sleutelhanger · Klemmetje",
      animal: "dog",
      edition: "keychain",
      attachment: "clip",
      quantity: 1,
      unitCents: 2799,
      notes: null,
      withdrawable: false,
    },
  ],
  shipment: { label: "Thuislevering met PostNL", deliveryType: "HOME", deliveryOptionId: "be-postnl-home" },
};

const build = (patch: Partial<ConfirmationOrder>) => buildOrderConfirmation({ ...order, ...patch }, "https://palleys.be");

describe("order confirmation", () => {
  it("is in Dutch for a Dutch order, and says no VAT is charged", () => {
    const mail = build({});
    expect(mail.subject).toBe("Bedankt voor je bestelling PLY1001");
    expect(mail.text).toContain("Palley Hond · Met sleutelhanger · Klemmetje × 1: € 27,99");
    expect(mail.text).toContain("Thuislevering met PostNL");
    expect(mail.text).toContain("geen btw");
    expect(mail.text).toContain("vervormen boven 50°C");
    expect(mail.html).toContain("vervormen boven 50°C");
    expect(mail.text).not.toContain("waarvan btw");
    expect(mail.html).toContain('lang="nl"');
    expect(mail.text).toContain("https://palleys.be/algemene-voorwaarden?versie=v1");
  });

  it("is in English for an English order, also the prices, the product and the terms link", () => {
    const mail = build({ locale: "en" });
    expect(mail.subject).toBe("Thank you for your order PLY1001");
    expect(mail.text).toContain("Palley Dog · With keychain · Clip × 1: € 27.99");
    expect(mail.text).toContain("Home delivery with PostNL");
    expect(mail.text).toContain("no VAT is charged");
    expect(mail.text).toContain("deform above 50°C");
    expect(mail.html).toContain('lang="en"');
    expect(mail.text).toContain("https://palleys.be/en/algemene-voorwaarden?versie=v1");
  });

  it("keeps a collectible's own name", () => {
    const collectible = { ...order.items[0], title: "Golden Retriever", animal: null, edition: null, attachment: null, withdrawable: true };
    expect(build({ locale: "en", items: [collectible] }).text).toContain("Golden Retriever × 1");
    expect(build({ locale: "en", items: [{ ...collectible, attachment: "key-ring" }] }).text).toContain("Golden Retriever · Key ring × 1");
  });

  it("names a collectible in the customer's language when it has a translation", () => {
    const item = { ...order.items[0], title: "Zwarte kat", animal: null, edition: null, attachment: null, withdrawable: true };
    const translated = { ...item, collectible: { translations: { en: { name: "Black cat" } } } };
    expect(build({ locale: "en", items: [translated] }).text).toContain("Black cat × 1");
    expect(build({ items: [translated] }).text).toContain("Zwarte kat × 1");
  });

  it("says how a parcel-free order reaches the customer", () => {
    const pickup = { label: "Ophalen", deliveryType: "PICKUP", deliveryOptionId: "be-pickup-kantienberg" };
    expect(build({ shipment: pickup, street: null }).text).toContain("campus Kantienberg");
    const friends = { label: "Vrienden", deliveryType: "HANDOVER", deliveryOptionId: "friends-family" };
    expect(build({ shipment: friends, street: null }).text).toContain("persoonlijk");
  });

  it("shows the enterprise number only when we have one", () => {
    const company = { legalName: "Palleys", address: "Gent", enterpriseNumber: "", email: "hallo@palleys.be" };
    expect(buildOrderConfirmation(order, "https://palleys.be", { company }).text).not.toContain("Ondernemingsnummer");
    const registered = { ...company, enterpriseNumber: "0123.456.789" };
    expect(buildOrderConfirmation(order, "https://palleys.be", { company: registered }).text).toContain("Ondernemingsnummer 0123.456.789");
  });

  it("falls back to the default language for an order in a language we no longer have", () => {
    expect(build({ locale: "fr" }).subject).toContain("Bedankt");
  });
});

describe("production mail", () => {
  it("says the order is in production and can no longer be cancelled for free", () => {
    const mail = buildProductionMail({ number: "PLY1001", firstName: "Emma <3", locale: "nl" });
    expect(mail.subject).toBe("Je bestelling PLY1001 is in productie");
    expect(mail.text).toContain("niet meer kosteloos annuleren");
    expect(mail.html).toContain("Emma &lt;3");
  });

  it("speaks the customer's language", () => {
    expect(buildProductionMail({ number: "PLY1001", firstName: "Emma", locale: "en" }).subject).toBe("Your order PLY1001 is in production");
  });
});

describe("new order mail for the team", () => {
  const teamOrder = {
    number: "PLY1001",
    firstName: "Emma",
    lastName: "Peeters",
    email: "emma@example.be",
    totalCents: 3294,
    discountCode: null,
    items: [
      { title: "Palley Hond", quantity: 2, unitCents: 1399, withdrawable: false },
      { title: "Golden Retriever", quantity: 1, unitCents: 1500, withdrawable: true },
    ],
    shipment: { label: "Thuislevering met PostNL" },
  };

  it("says what was ordered, what's next and where to find it", () => {
    const mail = buildNewOrderTeamMail(teamOrder, "https://palleys.be/admin/orders/x");
    expect(mail.subject).toBe("Nieuwe order PLY1001 (€ 32,94)");
    expect(mail.text).toContain("Palley Hond × 2: € 27,98");
    expect(mail.text).toContain("2 Palleys op maat staan klaar in Te reviewen");
    expect(mail.text).toContain("https://palleys.be/admin/orders/x");
  });

  it("passes on what went wrong with the payment", () => {
    expect(buildNewOrderTeamMail(teamOrder, "x", ["mogelijk dubbel betaald"]).text).toContain("Let op: mogelijk dubbel betaald");
  });
});
