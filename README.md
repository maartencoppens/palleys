add admin users to login:

- add email to secrets
- add email in google cloud console (google auth platform / audience)

## Shopify (headless)

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
