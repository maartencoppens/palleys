# Juridische go-live-checklist

Live gaan (live Stripe-sleutels) pas als alles afgevinkt is. Zoek in de code op `LEGAL-REVIEW` voor elke plek
waar juridische tekst of een juridische keuze zit.

## Bedrijf en voorwaarden
- [ ] `src/data/company.ts` of /admin/settings/company: echte naam, adres, e-mail, telefoon nakijken. Ondernemingsnummer
  staat leeg (studentenonderneming onder Unizo Step Up) en wordt dan nergens getoond; vul het in als Unizo zegt dat
  we het nummer van Unizo of de school moeten vermelden.
- [ ] Engelse vertaling van de voorwaarden en het privacybeleid laten nakijken (`core/locale/messages/en.ts`).
- [x] Algemene voorwaarden nagekeken door jurist/Unizo; concept-banner weg uit `LegalPage` (november 2026).
- [ ] `TERMS_VERSION` in `src/data/checkout.ts` bijgewerkt; oude versies blijven raadpleegbaar.
- [ ] Privacybeleid nagekeken, klopt met `docs/gdpr/register.md` en `docs/gdpr/subprocessors.md` (nog op te maken).
- [x] Pagina's `/verzendbeleid`, `/retourbeleid` (ook garantie en klachten) en `/contactgegevens`.
- [x] Geen cookiebeleid of cookiebanner: we gebruiken alleen strikt noodzakelijke cookies (winkelmandje, taal, sessie
  van de backoffice, /retour), en het privacybeleid zegt dat. Komt er ooit analytics of een marketingcookie bij, dan
  zijn een banner met toestemming en een cookiebeleid wel nodig.
- [ ] Footer met bedrijfsgegevens; geen EU-ODR-link, wel de Consumentenombudsdienst.

## Checkout (WER Boek VI)
- [x] Geen btw (vrijstelling via het Step Up-programma van Unizo), verzendkosten zichtbaar vóór betaling.
- [ ] Bij Unizo navragen hoe de vrijstelling op de site en in de bevestigingsmail vermeld moet worden, en welke bedrijfsgegevens (ondernemingsnummer) we tonen.
- [x] Samenvatting met product, aantal, prijs, verzending, totaal en leveringstermijn.
- [x] Verplicht, niet-aangevinkt vinkje voor de voorwaarden; aparte, niet-aangevinkte marketing-opt-in.
- [x] Knop "Bestellen met betalingsverplichting".
- [x] Melding dat het herroepingsrecht niet geldt (gepersonaliseerd), op de checkout en in de bevestigingsmail.
- [ ] Collectibles (niet gepersonaliseerd): 14 dagen herroepingsrecht laten nakijken: tekst in de voorwaarden (art. 4), checkout en bevestigingsmail, modelformulier voor herroeping toevoegen.
- [ ] Handmatig toegevoegde orders: de klant aanvaardt de voorwaarden niet online. Afspreken hoe dat gebeurt (bv. link meesturen).
- [ ] Dezelfde melding op de productpagina (`/create`).
- [x] `Order.termsVersion` en `termsAcceptedAt` worden opgeslagen.
- [x] Bevestigingsmail met ordernummer, overzicht, totaal, btw-vrijstelling, bedrijfsgegevens, link naar de geversioneerde voorwaarden.
- [ ] Resend ingesteld in de EU-regio, domein `palleys.be` geverifieerd (DNS-records uit het Resend-dashboard, nu ontbreken ze: elke bevestigingsmail faalt) en `EMAIL_FROM` op dat domein.

## Stripe
- [ ] Stripe-account geactiveerd (bedrijfsgegevens, bankrekening); Bancontact en iDEAL | Wero (en Wero) geactiveerd onder Settings → Payment methods, in test én live.
- [ ] Live payment method configuration (pmc_…) met Bancontact en iDEAL | Wero aan, kaarten/Apple Pay/Google Pay/Link uit; de id in `STRIPE_PAYMENT_METHOD_CONFIG` op de VPS.
- [ ] Live keys op de VPS (`STRIPE_SECRET=sk_live_…` of een restricted key met de rechten uit de README).
- [ ] Webhook-endpoint `https://palleys.be/api/webhooks/stripe` met de events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`; de signing secret in `STRIPE_WEBHOOK_SECRET`.
- [ ] Testbetaling in testmodus op de VPS: order wordt PAID, mail komt, preview staat in "Te reviewen".
- [ ] Webhook komt aan en handtekening klopt: in de logs `[webhook:stripe] cs_…: processed`, niet `rejected`; in het dashboard 200.
- [ ] Ongeldige webhook geweigerd: `curl -i -X POST https://palleys.be/api/webhooks/stripe -d '{}'` → 400.
- [ ] Cron ingesteld (`CRON_SECRET`, elke 10 minuten).
- [ ] Eén echte betaling met live keys, daarna terugbetalen in het Stripe-dashboard; de order gaat vanzelf naar REFUNDED.
- [ ] `/admin/settings/integrations` toont "Live" en alle drie de Stripe-variabelen als ingesteld.

## Beveiliging
- [ ] VPS: de app is alleen bereikbaar via een reverse proxy die `x-forwarded-for` aanvult (anders zijn de rate limits te omzeilen).
- [ ] `PAYMENT_PROVIDER` staat niet op `fake` in de `.env` van de VPS, en `/dev/test-betaling` geeft een 404.
- [ ] Geüploade bestanden beperken in grootte: de signed upload-URL controleert de echte grootte niet (`storage-client.ts`). Testen op echte R2.
- [ ] Geen makkelijk te raden kortingscodes zonder limiet in aantal of tijd.

## AVG / GDPR
- [ ] DPA's met Stripe (Stripe-DPA, aanvaard via de Stripe Services Agreement; doorgifte buiten de EER nakijken), Resend, Cloudflare, Aiven, Google (betaalde Gemini API), Meshy (open punt).
- [ ] EXIF/GPS uit uploads strippen (nu nog niet: uploads gaan rechtstreeks naar R2).
- [ ] Bewaartermijnen en cleanup-job (foto's, verlopen previews, orders 7 jaar daarna anonimiseren). De FAQ belooft nu dat foto's 14 dagen na ontvangst verwijderd worden: dat gebeurt nog niet automatisch.
- [ ] Datalekprocedure `docs/gdpr/datalek.md`.

## Productveiligheid (GPSR)
- [ ] Fabrikantgegevens en waarschuwingen (kleine onderdelen, < 3 jaar, metalen ring, vervorming boven 50°C) op productpagina en verpakking. De 50°C-waarschuwing staat al op de site en in de bevestigingsmail, nog niet op de verpakking.
