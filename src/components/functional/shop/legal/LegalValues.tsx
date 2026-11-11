import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import CompanyValue, { legalLinkClassName } from "@/components/functional/shop/legal/CompanyValue";
import { Link } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { getLocale, getMessages } from "@/core/locale/server";
import { getSiteSettings } from "@/core/modules/settings/service";
import { getDeliveryOptions } from "@/core/modules/shipping/service";
import { formatPrice } from "@/core/utils/format";
import { COMPANY } from "@/data/company";
import { PRIVACY_URL, TERMS_URL } from "@/data/checkout";
import type { LegalDocumentSlug } from "@/data/legal";
import { RETURN_POLICY_URL, RETURN_URL } from "@/data/returns";
import { SHIPPING_POLICY_URL, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";
import { SHOWN_KEYCHAIN_SIZE } from "@/data/sizes";
import type { Messages } from "@/core/locale/messages";

type Company = Pick<typeof COMPANY, "legalName" | "address" | "enterpriseNumber" | "email">;

async function CompanyLine({ company }: { company: Company }) {
  const { legal } = await getMessages();
  return fill(company.enterpriseNumber ? legal.terms.companyEnterprise : legal.terms.company, {
    name: company.legalName,
    address: company.address,
    enterprise: company.enterpriseNumber,
    email: company.email,
  });
}

async function LiveCompanyLine() {
  await connection();
  const { company } = await getSiteSettings();
  return <CompanyLine company={company} />;
}

type Price = { id: string; label: string; priceCents: number };

/** The options a customer can pick now, with the price from Instellingen → Verzending. */
async function PriceLine({ prices }: { prices: Price[] }) {
  const [{ legal, shipping }, locale] = await Promise.all([getMessages(), getLocale()]);
  const m = legal.shippingPolicy;
  return prices
    .map((option) =>
      fill(m.inBelgium, {
        label: shipping.options[option.id]?.label ?? option.label,
        price: option.priceCents === 0 ? m.free : formatPrice(option.priceCents / 100, locale),
      }),
    )
    .join("; ");
}

async function LivePrices() {
  await connection();
  const options = await getDeliveryOptions({ country: "BE" }, [{ size: SHOWN_KEYCHAIN_SIZE, quantity: 1 }]);
  return <PriceLine prices={options} />;
}

// While the settings load: the starting prices.
const STARTING_PRICES = STATIC_DELIVERY_OPTIONS.filter((option) => option.deliveryType === "HOME").map((option) => ({
  ...option,
  priceCents: option.defaultPriceCents,
}));

const link = (href: string, label: string) => (
  <Link href={href} className={legalLinkClassName}>
    {label}
  </Link>
);

/**
 * What the placeholders in a legal text become: live company details, the shipping prices and links to the other
 * pages. data/legal.ts says which ones a document may use; the editor shows them.
 */
export function legalValues(slug: LegalDocumentSlug, { legal }: Messages): Record<string, ReactNode> {
  const contact = slug === "contact";
  return {
    email: <CompanyValue field="email" link={contact} />,
    companyAddress: <CompanyValue field="nameAddress" />,
    companyContact: <CompanyValue field="contact" />,
    returnAddress: <CompanyValue field="returnAddress" />,
    name: <CompanyValue field="legalName" />,
    address: <CompanyValue field="address" />,
    phone: <CompanyValue field="phone" link />,
    company: (
      <Suspense fallback={<CompanyLine company={COMPANY} />}>
        <LiveCompanyLine />
      </Suspense>
    ),
    deliveryPrices: (
      <Suspense fallback={<PriceLine prices={STARTING_PRICES} />}>
        <LivePrices />
      </Suspense>
    ),
    returnUrl: link(RETURN_URL, "palleys.be/retour"),
    terms: link(TERMS_URL, contact ? legal.contactDetails.termsLink : legal.returnPolicy.termsLink),
    privacyPolicy: link(PRIVACY_URL, legal.terms.privacyLink),
    returnPolicy: link(RETURN_POLICY_URL, legal.terms.returnPolicyLink),
    shippingPolicy: link(SHIPPING_POLICY_URL, legal.contactDetails.shippingPolicyLink),
  };
}
