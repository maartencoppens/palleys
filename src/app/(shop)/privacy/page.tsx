import type { Metadata } from "next";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import { COMPANY } from "@/data/company";

export const metadata: Metadata = { title: "Privacybeleid | Palleys" };

// LEGAL-REVIEW: concept. Must match docs/gdpr/register.md and docs/gdpr/subprocessors.md once those exist.
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Juridisch"
      title="Privacybeleid"
      intro="Welke gegevens we bewaren, waarom, en hoe lang."
    >
      <h2>Wat we verwerken</h2>
      <ul>
        <li>Je foto’s van je huisdier, om je Palley te maken.</li>
        <li>Naam, e-mailadres, (optioneel) telefoon en leveradres, om je bestelling te leveren.</li>
        <li>
          De betaalstatus van Bancontact. Je naam en rekeningnummer als betaler bewaren we niet: die blijven bij
          Bancontact en je bank.
        </li>
      </ul>
      <h2>Waarom</h2>
      <p>
        Om de overeenkomst uit te voeren (je bestelling). Marketingmails sturen we alleen als je dat apart aanvinkt.
      </p>
      <h2>Met wie we gegevens delen</h2>
      <p>
        Bancontact en KBC (betalingen), onze vervoerder (levering), Resend (e-mail), Cloudflare (opslag van foto’s) en de AI-diensten
        die het 3D-model helpen maken.
      </p>
      <h2>Hoe lang</h2>
      <p>
        Niet-bestelde uploads verwijderen we automatisch. Bestelgegevens bewaren we zolang de boekhoudwet dat vraagt
        (7 jaar).
      </p>
      <h2>Je rechten</h2>
      <p>
        Je kunt je gegevens opvragen, laten verbeteren of laten wissen via {COMPANY.email}. Je kunt ook klacht indienen bij
        de Gegevensbeschermingsautoriteit.
      </p>
    </LegalPage>
  );
}
