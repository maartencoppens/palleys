import type { Metadata } from "next";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import { COMPANY } from "@/data/company";
import { TERMS_VERSION } from "@/data/checkout";

export const metadata: Metadata = { title: "Algemene voorwaarden | Palleys" };

// LEGAL-REVIEW: concept. Keep every published version reachable; Order.termsVersion refers to TERMS_VERSION.
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Juridisch"
      title="Algemene voorwaarden"
      intro={`Versie ${TERMS_VERSION}. Deze voorwaarden gelden voor elke bestelling bij Palleys.`}
    >
      <h2>1. Wie we zijn</h2>
      <p>
        {COMPANY.legalName}, {COMPANY.address}. Ondernemingsnummer {COMPANY.enterpriseNumber}, btw {COMPANY.vatNumber}.
        E-mail: {COMPANY.email}.
      </p>
      <h2>2. Bestellen en betalen</h2>
      <p>
        Alle prijzen zijn in euro, inclusief 21% btw. Verzendkosten zie je voor je betaalt. De overeenkomst komt tot stand
        zodra je betaling bevestigd is; je krijgt dan een bevestigingsmail. Je betaalt met Bancontact (Bancontact Pro, via KBC).
      </p>
      <h2>3. Gepersonaliseerd product: geen herroepingsrecht</h2>
      <p>
        Elke Palley wordt op maat gemaakt op basis van de foto’s die jij aanlevert. Daarom geldt het herroepingsrecht niet
        (art. VI.53, 3° Wetboek van economisch recht).
      </p>
      <h2>4. Levering</h2>
      <p>We leveren enkel in België, binnen 2–3 weken na je bestelling en uiterlijk binnen 30 dagen.</p>
      <h2>5. Wettelijke garantie en klachten</h2>
      <p>
        Je hebt 2 jaar wettelijke garantie op conformiteit. Is je Palley beschadigd of klopt hij niet met je bestelling,
        mail ons dan met je bestelnummer. Kom je er met ons niet uit, dan kun je terecht bij de Consumentenombudsdienst
        (consumentenombudsdienst.be).
      </p>
      <h2>6. Je foto’s</h2>
      <p>
        Je verklaart dat je de rechten hebt op de foto’s die je uploadt en dat er alleen een huisdier op staat. We gebruiken
        ze enkel om je Palley te maken. Het 3D-model wordt met hulp van AI gemaakt en door ons team bijgewerkt.
      </p>
    </LegalPage>
  );
}
