# Wijzigingen t.o.v. PLAN-shopify-exit.md

## 31/10/2026: Bancontact Pro in plaats van Mollie, enkel België

**Waarom:** Mollie vraagt een btw-nummer; onder het STEP UP-statuut van Unizo (studentenonderneming) is er geen.
Bancontact Pro loopt via een handelaarscontract met KBC.

**Wat dat betekent voor het plan:**
- Fase 4/5: `PaymentProvider` heeft één implementatie, Bancontact Pro (`core/modules/payments/providers/bancontact.ts`,
  client in `core/networking/external/bancontact-client.ts`). Docs: docs.bancontactpro.com (Payment API v3).
  - Gehoste betaalpagina (`_links.checkout.href`), bedragen in centen, `reference` = ons ordernummer.
  - Callbacks zijn **ondertekend** (detached JWS, ES256, sleutels via JWKS). We controleren de handtekening én halen
    de status daarna toch opnieuw op via `GET /v3/payments/{id}`.
  - Return-URL moet https zijn (lokaal: `npm run dev:https`).
  - Betalingen verlopen na 20 minuten; de cron sluit onbetaalde orders na 30 minuten.
- Mollie-code is volledig verwijderd (`mollie-client.ts`, provider, webhookroute, env var).
- **Enkel verkoop in België:** één land in `src/data/shipping.ts`, één verzendoptie (bpost thuislevering), één
  betaalmethode. Checkout weigert andere landen.
- Fase 6: terugbetalen via het Bancontact Pro-portaal. De refund-API bestaat, maar vraagt dat wíj requests
  ondertekenen en een eigen JWKS publiceren; dat is een latere stap.
- Fase 8 (EU) en fase 9 (Bancontact Pro als goedkopere route) vervallen in hun huidige vorm: Bancontact Pro ís nu
  de route. Verkopen buiten België vraagt later een tweede provider (bv. Mollie zodra er een btw-nummer is).

**Nog te bevestigen bij KBC/Bancontact (devsupport@bancontact.com):**
- Auth-header: `Authorization: Bearer <key>` (spec) vs. kale sleutel (voorbeeld in de gids). De code gebruikt `Bearer`.
- Of de preprod-omgeving bij het KBC-contract hoort en hoe je er een sleutel voor krijgt.
- Kosten per transactie in het contract.
- Of `PENDING_MERCHANT_ACKNOWLEDGEMENT` voor ons profiel van toepassing is (dan moet er een acknowledge-call bij).
