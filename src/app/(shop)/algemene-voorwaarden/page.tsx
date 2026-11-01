import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import DeliveryTime from "@/components/functional/shop/DeliveryTime";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import { getSiteSettings } from "@/core/modules/settings/service";
import { COMPANY } from "@/data/company";
import { TERMS_VERSION } from "@/data/checkout";

export const metadata: Metadata = { title: "Algemene voorwaarden | Palleys" };

function CompanyLine({ company }: { company: Pick<typeof COMPANY, "legalName" | "address" | "enterpriseNumber" | "vatNumber" | "email"> }) {
  return (
    <p>
      {company.legalName}, {company.address}. Ondernemingsnummer {company.enterpriseNumber}, btw {company.vatNumber}.
      E-mail: {company.email}.
    </p>
  );
}

async function LiveCompanyLine() {
  await connection();
  const { company } = await getSiteSettings();
  return <CompanyLine company={company} />;
}

// LEGAL-REVIEW: concept. Keep every published version reachable; Order.termsVersion refers to TERMS_VERSION.
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Juridisch"
      title="Algemene voorwaarden"
      intro={`Versie ${TERMS_VERSION}. Deze voorwaarden gelden voor elke bestelling bij Palleys.`}
    >
      <h2>1. Wie we zijn</h2>
      <Suspense fallback={<CompanyLine company={COMPANY} />}>
        <LiveCompanyLine />
      </Suspense>
      <h2>2. Bestellen en betalen</h2>
      <p>
        Alle prijzen zijn in euro, inclusief 21% btw. Verzendkosten zie je voor je betaalt. De overeenkomst komt tot stand
        zodra je betaling bevestigd is; je krijgt dan een bevestigingsmail. Je betaalt met Bancontact (Bancontact Pro, via KBC).
      </p>
      <h2>3. Gepersonaliseerde Palley: geen herroepingsrecht</h2>
      <p>
        Een gepersonaliseerde Palley wordt op maat gemaakt op basis van de foto’s die jij aanlevert. Daarom geldt het herroepingsrecht niet
        (art. VI.53, 3° Wetboek van economisch recht).
      </p>
      <h2>4. Collectibles: 14 dagen herroepingsrecht</h2>
      <p>
        Collectibles zijn kant-en-klare modellen die niet op maat gemaakt zijn. Die mag je binnen 14 dagen na ontvangst zonder
        reden herroepen: mail ons met je bestelnummer en stuur het product binnen 14 dagen ongebruikt terug. De kosten van het
        terugsturen zijn voor jou. Je krijgt je betaling, inclusief de standaard verzendkosten, binnen 14 dagen terug.
      </p>
      <h2>5. Levering</h2>
      <p>
        We leveren enkel in België, binnen <DeliveryTime /> na je bestelling en uiterlijk binnen 30 dagen.
      </p>
      <h2>6. Wettelijke garantie en klachten</h2>
      <p>
        Je hebt 2 jaar wettelijke garantie op conformiteit. Is je Palley beschadigd of klopt hij niet met je bestelling,
        mail ons dan met je bestelnummer. Kom je er met ons niet uit, dan kun je terecht bij de Consumentenombudsdienst
        (consumentenombudsdienst.be).
      </p>
      <h2>7. Je foto’s</h2>
      <p>
        Je verklaart dat je de rechten hebt op de foto’s die je uploadt en dat er alleen een huisdier op staat. We gebruiken
        ze enkel om je Palley te maken. Het 3D-model wordt met hulp van AI gemaakt en door ons team bijgewerkt.
      </p>
    </LegalPage>
  );
}
