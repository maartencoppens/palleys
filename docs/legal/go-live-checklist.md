# Juridische go-live-checklist

Live gaan (`BANCONTACT_ENV=production`) pas als alles afgevinkt is. Zoek in de code op `LEGAL-REVIEW` voor elke plek
waar juridische tekst of een juridische keuze zit.

## Bedrijf en voorwaarden
- [ ] `src/data/company.ts`: echte naam, adres, ondernemingsnummer, btw-nummer, e-mail, telefoon (nu `TODO`).
- [ ] Algemene voorwaarden nagekeken door jurist/Unizo; concept-banner weg uit `LegalPage`.
- [ ] `TERMS_VERSION` in `src/data/checkout.ts` bijgewerkt; oude versies blijven raadpleegbaar.
- [ ] Privacybeleid nagekeken, klopt met `docs/gdpr/register.md` en `docs/gdpr/subprocessors.md` (nog op te maken).
- [ ] Pagina's `/verzending-en-levering`, `/garantie-en-klachten`, `/contact`, `/cookies` (indien nodig).
- [ ] Footer met bedrijfsgegevens; geen EU-ODR-link, wel de Consumentenombudsdienst.

## Checkout (WER Boek VI)
- [x] Prijzen incl. btw, verzendkosten zichtbaar vóór betaling.
- [x] Samenvatting met product, aantal, prijs, verzending, totaal en leveringstermijn.
- [x] Verplicht, niet-aangevinkt vinkje voor de voorwaarden; aparte, niet-aangevinkte marketing-opt-in.
- [x] Knop "Bestellen met betalingsverplichting".
- [x] Melding dat het herroepingsrecht niet geldt (gepersonaliseerd), op de checkout en in de bevestigingsmail.
- [ ] Dezelfde melding op de productpagina (`/create`).
- [x] `Order.termsVersion` en `termsAcceptedAt` worden opgeslagen.
- [x] Bevestigingsmail met ordernummer, overzicht, totaal, btw, bedrijfsgegevens, link naar de geversioneerde voorwaarden.
- [ ] Resend ingesteld in de EU-regio, domein geverifieerd (`EMAIL_FROM`).

## Bancontact Pro (KBC)
- [ ] Handelaarscontract getekend; toegang tot portal.bancontactpro.com; preprod- en productiesleutel ontvangen.
- [ ] In het portaal: payment profile voor online verkoop, callback-URL `https://palleys.be/api/webhooks/bancontact`.
- [ ] Testbetaling in preprod op de VPS: order wordt PAID, mail komt, preview staat in "Te reviewen".
- [ ] Callback bereikbaar en handtekening klopt: in de logs `[webhook:bancontact] <id>: processed`, niet `rejected`.
- [ ] Ongeldige callback geweigerd: `curl -i -X POST https://palleys.be/api/webhooks/bancontact -d '{}'` → 401.
- [ ] Cron ingesteld (`CRON_SECRET`, elke 10 minuten).
- [ ] Eén echte betaling met `BANCONTACT_ENV=production`, daarna terugstorten (portaal of overschrijving).
- [ ] Werkwijze voor terugbetalingen afgesproken (portaal; de refund-API vraagt eigen ondertekende requests, later).

## AVG / GDPR
- [ ] DPA's met Bancontact/KBC, Resend, Cloudflare, Aiven, Google (betaalde Gemini API), Meshy (open punt).
- [ ] EXIF/GPS uit uploads strippen (nu nog niet: uploads gaan rechtstreeks naar R2).
- [ ] Bewaartermijnen en cleanup-job (foto's, verlopen previews, orders 7 jaar daarna anonimiseren).
- [ ] Datalekprocedure `docs/gdpr/datalek.md`.

## Productveiligheid (GPSR)
- [ ] Fabrikantgegevens en waarschuwingen (kleine onderdelen, < 3 jaar, metalen ring) op productpagina en verpakking.
