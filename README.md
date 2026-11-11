add admin users to login:

- add email to secrets
- add email in google cloud console (google auth platform / audience)

## Lokale ontwikkeling

```bash
npm run db:up          # Postgres in Docker (docker-compose.dev.yml)
npm run db:migrate     # prisma migrate dev, ALLEEN lokaal
npx prisma generate    # na elke schemawijziging (Prisma 7 doet dit niet automatisch); herstart daarna `npm run dev`
npm test               # unit tests
npm run test:integration   # checkout → betaling → order, tegen de lokale DB, met Stripe/R2/Resend gemockt
```

Productie start met `npm run start:prod` (`prisma migrate deploy && next start`). Het image moet dus de Prisma CLI
(staat in `dependencies`), `prisma.config.ts` en `src/db/migrations` bevatten. Nooit `migrate dev` of `reset` op prod.

## Checkout en betalingen (Stripe Checkout)

Enkel België. Flow: `/create` uploadt foto's naar R2 (`/api/uploads`) → `/api/cart` zet de preview in ons eigen
winkelmandje (DB, token in een httpOnly-cookie) → `/checkout` vraagt gegevens en levering → `/api/checkout` maakt een order
(`PENDING_PAYMENT`, bedragen server-side uit `src/data/pricing.ts` en de verzendopties) en een Stripe Checkout Session
(`client_reference_id` = ordernummer, 30 minuten geldig) → klant betaalt op de gehoste Stripe-pagina met de methodes uit de
payment method configuration (Bancontact, iDEAL | Wero) → Stripe stuurt een **ondertekende** webhook naar
`/api/webhooks/stripe` → we controleren de handtekening (`stripe-signature`, `STRIPE_WEBHOOK_SECRET`), halen de session
opnieuw op bij Stripe en zetten order én preview op `PAID`. De preview verschijnt dan in **Te reviewen** in de backoffice.
De return-pagina (`/checkout/return`) vraagt de status ook zelf op, dus lokaal werkt het ook zonder webhook. Komt de klant
via "terug" van Stripe (`cancelled=1`), dan sluit de server de nog open session, zodat er geen tweede betaling naast een
nieuwe poging kan gebeuren.

Env vars (zie `.env.example`): `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PAYMENT_METHOD_CONFIG` (test en live
hebben elk eigen waarden), `RESEND_API_KEY` + `EMAIL_FROM` (bevestigingsmails), `CRON_SECRET`. `STRIPE_PUBLIC` wordt niet
gebruikt. De Stripe-API-versie staat vast in `src/core/networking/external/stripe-client.ts`.

Lokaal testen met echte testbetalingen (http://localhost volstaat):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # geeft de whsec_ voor STRIPE_WEBHOOK_SECRET
```

**Betaalmethodes** beheer je onder **Website-instellingen → Betaalmethodes**: dat leest en wijzigt de configuratie in Stripe
zelf (niets in onze DB), met een auditlog (`AdminAuditLog`). Alleen methodes uit de allowlist in
`src/data/payment-methods.ts` kunnen aan; kaarten (card, Apple Pay, Google Pay, Link) enkel na een bevestiging. Een
restricted key (`rk_…`) heeft minstens nodig: Checkout Sessions *Write*, Payment Intents *Read*, Charges *Read*
(refunds/disputes op de session), Payment Method Configurations *Read* (en *Write* om ze in de admin te wijzigen).

**Testen zonder Stripe:** zet `PAYMENT_PROVIDER=fake` in `.env` en herstart. De checkout stuurt dan naar
`/dev/test-betaling`, waar je kiest hoe de betaling afloopt (gelukt, mislukt, geannuleerd, verlopen). De rest van de flow is de
echte. In productie staat dit altijd uit: `next build` en `next start` negeren de instelling en de pagina geeft een 404.
Zonder Stripe-sleutels en zonder `fake` blijft afrekenen dicht, ook als bestellen aan staat in de instellingen ("Betalen is
tijdelijk niet mogelijk"). De instellingenpagina meldt dat.

Terugbetalen gebeurt in het Stripe-dashboard. Het bedrag komt vanzelf binnen (webhook `charge.refunded` of "Betaalstatus
ophalen"); een volledige terugbetaling zet de order op `REFUNDED`. Een dispute zet de order op "aandacht nodig".

De app moet achter een reverse proxy draaien die `x-forwarded-for` aanvult. De rate limits lezen de laatste waarde daarin;
zonder proxy kan een bezoeker die waarde zelf kiezen en de limieten omzeilen.

Cron op de VPS (elke 10 minuten), sluit onbetaalde orders en ruimt winkelmandjes op:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://palleys.be/api/cron/expire-orders
```

Juridische to-do's: `docs/legal/go-live-checklist.md`.

## Naamgeving

Alle ID's, productcodes en bestandsnamen komen uit `src/core/utils/naming.ts` (codes en prefixen in `src/data/naming.ts`);
nergens anders worden ze met de hand samengesteld. De database bewaart de onderdelen, de namen worden berekend.

| Wat | Voorbeeld |
| --- | --- |
| Order (`Order.number`, Stripe `client_reference_id`) | `PLY1042` (één doorlopende teller, start bij 1001) |
| Factuur (`Order.invoiceNumber`, pas bij betaling) | `F2026-0001` |
| Preview zonder betaalde order | `PRV-A3F9C2E1` |
| Collectible | `COL-007-HOND` |
| Productcode | `P-RING-KAT`, `COL-CLP-007` |
| Palley (fysiek exemplaar, printbestanden) | `PAL-PLY1042-01-P-RING-KAT`, herdruk `…-R1` |

R2-keys blijven op UUID's; leesbare namen krijgt een bestand pas bij het downloaden. Na de migratie `naming_standard`
zet `npm run db:backfill-naming` bestaande rijen recht (eerst zonder vlag: alleen tonen; `--apply` om te schrijven;
`--renumber-orders` geeft oude orders `PAL-2026-…` ook een `PLY`-nummer, enkel voor testdata). Twee keer draaien verandert niets.

## Talen

De winkel is er in het Nederlands (hoofdtaal, `/create`) en het Engels (`/en/create`); de backoffice blijft Nederlands.
`src/proxy.ts` stuurt adressen zonder taal door naar `/nl/...`, en alles onder `src/app/[lang]` kent zijn taal uit de URL. De
bezoeker wisselt met NL | EN in de navbar; een bestelling onthoudt haar taal voor de bevestigingsmail en de terugkeerpagina.

Alle teksten staan in `src/core/locale/messages`, één bestand per taal. In een Server Component: `await getMessages()` uit
`core/locale/server`; in een Client Component: `useMessages()` uit `core/locale/client`. Gebruik voor interne links `Link` uit
`core/locale/client`, zodat de bezoeker in zijn taal blijft. Wat een admin beheert (FAQ, banner, levertijd) staat per taal onder
**Teksten**. Namen en beschrijvingen van collectibles hebben maar één taal.

**Een taal toevoegen:** kopieer `messages/en.ts`, vertaal, voeg de taal toe in `core/locale/config.ts` en `messages/index.ts` en in
`DEFAULT_SITE_CONTENT` (`src/data/site-content.ts`). TypeScript en `messages.test.ts` weigeren ontbrekende teksten of placeholders.

## Btw

Palleys is als studentenonderneming in het Step Up-programma van Unizo vrijgesteld en rekent geen btw aan (`VAT_RATE_BASIS_POINTS = 0` in `src/data/pricing.ts`). Klanten betalen de productprijs plus de
verzendkosten; `Order.vatCents` is 0. Oude orders met btw tonen die nog gewoon in de backoffice.

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
| Kortingscodes | percentage of bedrag, voorwaarden, gebruik | tabel `DiscountCode` |
| Verzending | prijs en aan/uit per optie | `ShopSettings.shippingOverrides` |
| Teksten | infobanner, levertijd, retourtekst, FAQ | `ShopSettings.siteContent` |
| Bedrijf & sociale media | wettelijke gegevens, profiel-URL's | `ShopSettings.company` |
| Betaalmethodes | aan/uit per methode in Stripe | Stripe payment method configuration |
| Koppelingen | status van Stripe, mail, cron (alleen-lezen) | `.env` |

`src/data` bevat de startwaarden; die gelden tot de eerste keer opslaan, en als opgeslagen JSON niet meer klopt. Een instelling
toevoegen: schema in `core/modules/settings/types.ts`, startwaarde in `settings/service.ts`, veld in het formulier van de sectie.

Openbare pagina's lezen instellingen en collectibles in een `<Suspense>`-blok met `await connection()`, zodat `next build`
geen database nodig heeft. Wat in zo'n blok binnenkomt, krijgt geen `data-animate` (tenzij `SiteAnimations` in hetzelfde blok
staat, zoals op `/create`).

**Collectibles** zijn kant-en-klare modellen zonder foto: `/shop`, `/shop/<slug>` en de homepage (de eerste vier). Foto's gaan
via onze server (omgezet naar WebP) naar R2 en zijn publiek via `/api/collectibles/images/<bestand>`. Verwijderen archiveert:
oude orders verwijzen er nog naar en terugzetten kan. Ze zijn niet op maat gemaakt, dus er geldt wel 14 dagen herroepingsrecht
(`OrderItem.withdrawable`).

**Kortingscodes** gelden bij het afrekenen op de producten, nooit op de verzending. Hoe vaak een code gebruikt is, wordt niet
bijgehouden maar geteld: de orders met die code die niet geannuleerd of verlopen zijn. Een onbetaalde order houdt de code dus
bezet tot ze sluit (de cron), en de laatste keer kan niet aan twee klanten tegelijk gaan (rijvergrendeling bij het aanmaken van
de order). Is er niets meer te betalen, dan is de order meteen betaald, zonder Stripe. Een gebruikte code kan niet
verwijderd worden, alleen uitgezet.

**Levering zonder verzending.** "Ophalen op campus Kantienberg" is een gewone leveroptie (aan/uit en prijs onder **Verzending**). "Vrienden en familie" verschijnt alleen met een kortingscode waarop "gratis persoonlijk overhandigen" aanstaat; de korting zelf mag dan leeg zijn. Beide vragen geen adres, gaan niet naar een vervoerder en staan in de check-in op "overhandigen". De klant op de hoogte brengen dat het klaarligt gebeurt voorlopig met de hand.

**Order toevoegen** (`/admin/orders/new`), bv. voor een vriend: gewoon ordernummer, zelfde tabellen en zelfde verdere stappen,
gemarkeerd met `Order.createdBy`. E-mail en adres zijn optioneel (overhandigen), de prijs per lijn kan aangepast worden en de
voorwaarden blijven leeg omdat de klant ze niet online aanvaardde. Betalen kan op drie manieren: betaallink (Stripe Checkout,
30 minuten geldig; kan zodra Stripe gekoppeld is), al betaald (contant, overschrijving, geschenk) of later. Zo'n
order blijft open tot ze betaald of geannuleerd is: de cron sluit ze niet, en een verlopen betaallink kan opnieuw gemaakt worden.
