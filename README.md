add admin users to login:

- add email to secrets
- add email in google cloud console (google auth platform / audience)

## Lokale ontwikkeling

```bash
npm run db:up          # Postgres in Docker (docker-compose.dev.yml)
npm run db:migrate     # prisma migrate dev, ALLEEN lokaal
npx prisma generate    # na elke schemawijziging (Prisma 7 doet dit niet automatisch); herstart daarna `npm run dev`
npm test               # unit tests
npm run test:integration   # checkout → betaling → order, tegen de lokale DB, met Bancontact/R2/Resend gemockt
```

Productie start met `npm run start:prod` (`prisma migrate deploy && next start`). Het image moet dus de Prisma CLI
(staat in `dependencies`), `prisma.config.ts` en `src/db/migrations` bevatten. Nooit `migrate dev` of `reset` op prod.

## Checkout en betalingen (Bancontact Pro via KBC)

Enkel België, enkel Bancontact. Flow: `/create` uploadt foto's naar R2 (`/api/uploads`) → `/api/cart` zet de
preview in ons eigen winkelmandje (DB, token in een httpOnly-cookie) → `/checkout` vraagt gegevens en levering →
`/api/checkout` maakt een order (`PENDING_PAYMENT`, bedragen server-side uit `src/data/pricing.ts` en de
verzendopties) en een Bancontact-betaling (`reference` = ordernummer) → klant betaalt op de gehoste Bancontact-pagina
(QR-code op desktop, bankapp op gsm) → Bancontact post een **ondertekende** callback naar `/api/webhooks/bancontact`
→ we controleren de JWS-handtekening (ES256, sleutels van `jwks.bancontact.net`), halen de betaling opnieuw op bij
Bancontact en zetten order én preview op `PAID`. De preview verschijnt dan in **Te reviewen** in de backoffice.
De return-pagina (`/checkout/return`) vraagt de status ook zelf op, dus lokaal werkt het zonder callback.

Env vars (zie `.env.example`): `BANCONTACT_API_KEY`, `BANCONTACT_PAYMENT_PROFILE_ID`, `BANCONTACT_ENV`
(`preprod` / `production`), `RESEND_API_KEY` + `EMAIL_FROM` (bevestigingsmails), `CRON_SECRET`.

Bancontact aanvaardt enkel een **https**-return-URL. Lokaal testen: `npm run dev:https` en
`APP_URL=https://localhost:3000` in `.env`. Een betaling verloopt na 20 minuten.

Terugbetalen gebeurt voorlopig via het Bancontact Pro-portaal; markeer het daarna in de backoffice als afgehandeld.

Cron op de VPS (elke 10 minuten), sluit onbetaalde orders en ruimt winkelmandjes op:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://palleys.be/api/cron/expire-orders
```

Juridische to-do's: `docs/legal/go-live-checklist.md`.

## Backoffice

De backoffice heeft twee delen, zo staat het ook in de navigatie:

**Orders: de check-in per order** (`/admin`, `/admin/orders`, `/admin/review`, `/admin/approved`, `/admin/processed`).
`/admin` toont alle betaalde orders die nog weg moeten, met de volgende stap. Een gepersonaliseerde Palley gaat eerst door
de pipeline (Te reviewen → Goedgekeurd → Processed); een collectible slaat die over. Op de orderpagina vinkt een admin elk
item af zodra het gecontroleerd en klaar is, en pas als alles afgevinkt is, kan de order op verzonden of overhandigd.

**Website-instellingen** (`/admin/settings`). Elke sectie heeft een eigen pagina en wordt apart opgeslagen:

| Sectie | Wat | Waar het staat |
| --- | --- | --- |
| Bestellen | checkout aan/uit, boodschap | `ShopSettings` |
| Gepersonaliseerde Palley | prijzen, uitvoeringen, dieren | `ShopSettings.catalog` |
| Collectibles | producten toevoegen, aanpassen, verwijderen | tabel `Collectible` |
| Verzending | prijs en aan/uit per optie | `ShopSettings.shippingOverrides` |
| Teksten | infobanner, levertijd, retourtekst, FAQ | `ShopSettings.siteContent` |
| Bedrijf & sociale media | wettelijke gegevens, profiel-URL's | `ShopSettings.company` |
| Koppelingen | status van Bancontact, mail, cron (alleen-lezen) | `.env` |

`src/data` bevat de startwaarden; die gelden tot de eerste keer opslaan, en als opgeslagen JSON niet meer klopt. Een instelling
toevoegen: schema in `core/modules/settings/types.ts`, startwaarde in `settings/service.ts`, veld in het formulier van de sectie.

Openbare pagina's lezen instellingen en collectibles in een `<Suspense>`-blok met `await connection()`, zodat `next build`
geen database nodig heeft. Wat in zo'n blok binnenkomt, krijgt geen `data-animate` (tenzij `SiteAnimations` in hetzelfde blok
staat, zoals op `/create`).

**Collectibles** zijn kant-en-klare modellen zonder foto: `/shop`, `/shop/<slug>` en de homepage (de eerste vier). Foto's gaan
via onze server (omgezet naar WebP) naar R2 en zijn publiek via `/api/collectibles/images/<bestand>`. Verwijderen archiveert:
oude orders verwijzen er nog naar en terugzetten kan. Ze zijn niet op maat gemaakt, dus er geldt wel 14 dagen herroepingsrecht
(`OrderItem.withdrawable`).

**Order toevoegen** (`/admin/orders/new`), bv. voor een vriend: gewoon ordernummer, zelfde tabellen en zelfde verdere stappen,
gemarkeerd met `Order.createdBy`. E-mail en adres zijn optioneel (overhandigen), de prijs per lijn kan aangepast worden en de
voorwaarden blijven leeg omdat de klant ze niet online aanvaardde. Betalen kan op drie manieren: Bancontact-betaallink (de klant
scant de QR met de app; kan zodra Bancontact Pro gekoppeld is), al betaald (contant, overschrijving, geschenk) of later. Zo'n
order blijft open tot ze betaald of geannuleerd is: de cron sluit ze niet, en een verlopen betaallink kan opnieuw gemaakt worden.

## Shopify (headless, wordt uitgefaseerd)

Niet meer gebruikt door de winkel; alleen de oude webhook blijft voor lopende orders. Wat er nog weg moet:
`docs/shopify-exit/inventory.md` (fase 7).


Env vars (see `.env.example`):

- `SHOPIFY_STORE_DOMAIN`: `jouwshop.myshopify.com` (of alleen `jouwshop`)
- `SHOPIFY_API_VERSION`: bv. `2026-10` (zelfde versie voor Storefront en Admin)
- `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`: private token van het Headless-kanaal (server-only)
- `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`: Dev Dashboard-app in dezelfde organisatie als de shop.
  De app haalt zelf een Admin-token op (client credentials grant, ~24u geldig) en verifieert webhooks met het secret.

Setup in Shopify:

1. Headless-kanaal: product `gepersonaliseerde-palley` publiceren naar dat kanaal, anders vindt de cart de varianten niet.
   SKU's moeten exact `PAL-GP-{KEY|FIG}-{DIER}` zijn (zie `src/data/options.ts`).
2. Dev Dashboard-app: scopes `read_orders`, `write_orders`; app installeren op de shop.
3. Webhook `orders/paid` → `https://<APP_URL>/api/webhooks/shopify-orders-paid`
   (in de app-config via Shopify CLI, of via de Admin API-mutation `webhookSubscriptionCreate`).

Flow: `/create` uploadt foto's naar R2 (`/api/uploads`) → `/api/cart` zet de variant in de Shopify-cart met
`_previewId` als verborgen line attribute → klant rekent af op Shopify's checkout → `orders/paid` zet de preview op `PAID`.
Lukt dat niet (verlopen preview, dubbel betaald), dan krijgt de order de tag `palleys-preview-probleem`.
