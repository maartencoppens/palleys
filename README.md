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

Backoffice: `/admin/orders` (orders, betaalstatus, problemen), `/admin/settings` (checkout aan/uit, verzendprijzen,
status van de koppelingen). Juridische to-do's: `docs/legal/go-live-checklist.md`.

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
