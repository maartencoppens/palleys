# Shopify-inventaris (fase 1)

Alles wat nog naar Shopify verwijst. **Pas verwijderen in fase 7**, nadat een echte Bancontact-betaling end-to-end gelukt is.
Sinds de overstap gebruikt de winkel deze code niet meer; alleen de oude webhook blijft bereikbaar voor orders die
nog via Shopify binnenkomen.

## Volledig te verwijderen

| Pad | Wat |
|---|---|
| `src/core/networking/external/shopify-client.ts` | Storefront + Admin GraphQL-client, HMAC-check webhooks |
| `src/core/modules/shopify/cart.ts` | Storefront cart-mutaties, variant-lookup met `cachedSkus`-log |
| `src/core/modules/shopify/service.ts` | Oude cart-orchestratie (vervangen door `core/modules/cart`) |
| `src/core/modules/shopify/api.ts` | Oude client-wrappers rond `/api/cart` (vervangen door `core/modules/cart/api.ts`) |
| `src/core/modules/shopify/types.ts` | Shopify-cart types |
| `src/core/modules/shopify/admin.ts` | `tagsAdd` op Shopify-orders |
| `src/core/modules/shopify/webhook.ts` (+ `webhook-types.ts`, `webhook-utils.ts`) | Handler voor `orders/paid` (verhuisd uit `core/modules/orders`) |
| `src/app/api/webhooks/shopify-orders-paid/route.ts` | Webhook-route `orders/paid` |
| `src/data/shopify.ts` | Shopify-context, line attributes, cart-cookie, variant-cache-TTL, problem-tag |

## Aan te passen

| Pad | Wat |
|---|---|
| `src/core/utils/env.ts` | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_API_VERSION`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` |
| `.env.example`, `.env` (lokaal + VPS) | dezelfde `SHOPIFY_*` vars |
| `src/data/options.ts` | `shopifyValue`, `SHOPIFY_PRODUCT_HANDLE`, comment over het Shopify-product |
| `src/data/products.ts` | `PRODUCT_HANDLE` (alleen nog door Shopify gebruikt) |
| `src/data/sizes.ts` | comment "later koppelen aan Shopify-varianten" |
| `src/db/schema.prisma` | `Preview.shopifyOrderId`, `Preview.shopifyLineItemId` (kolommen droppen na export/archief) |
| `src/app/admin/(protected)/previews/[id]/page.tsx` | toont nog `shopifyOrderId` voor oude orders |
| `src/core/modules/previews/{service,types}.ts` | `shopifyOrderId` in admin-detail en zoeken |
| `README.md` | sectie "Shopify (headless)" |

## Buiten de code

- Webhook `orders/paid` in de Shopify-admin / Dev Dashboard-app verwijderen.
- Headless-kanaal en Dev Dashboard-app uitschakelen; Shopify-abonnement opzeggen.
- In `.env` stond een geplakt `curl`-commando met een Storefront-token (nu in commentaar). **Dat token roteren of intrekken**
  zodra Shopify uitgeschakeld wordt.

## Wat al hernoemd is (fase 3)

- `Preview.shopifyOrderNumber` → `Preview.orderNumber` in de code, via `@map("shopifyOrderNumber")`: de DB-kolom
  heet nog hetzelfde, er is dus geen datamigratie. Bevat voor oude orders het Shopify-nummer (bv. `1042`), voor nieuwe
  orders `PAL-2026-00042`. Wordt gebruikt in de printbestandsnaam. Kolom echt hernoemen kan in fase 7.
