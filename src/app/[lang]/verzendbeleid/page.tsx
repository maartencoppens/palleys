import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import CompanyValue from "@/components/functional/shop/legal/CompanyValue";
import LegalPage from "@/components/functional/shop/legal/LegalPage";
import LegalText from "@/components/functional/shop/legal/LegalText";
import { Link } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { getLocale, getMessages, metadataLocale } from "@/core/locale/server";
import { getDeliveryOptions } from "@/core/modules/shipping/service";
import { formatPrice } from "@/core/utils/format";
import { RETURN_POLICY_URL } from "@/data/returns";
import { SHIPPING_POLICY_URL, STATIC_DELIVERY_OPTIONS } from "@/data/shipping";
import { SHOWN_KEYCHAIN_SIZE } from "@/data/sizes";
import { pageMetadata } from "@/core/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[lang]/verzendbeleid">): Promise<Metadata> {
  const { locale, messages } = await metadataLocale(params);
  const m = messages.meta.shippingPolicy;
  return pageMetadata({ locale, path: SHIPPING_POLICY_URL, title: m.title, description: m.description });
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

// LEGAL-REVIEW: the shipping policy; the costs come live from the shipping settings, the e-mail from the company settings.
export default async function ShippingPolicyPage() {
  const { legal: m } = await getMessages();
  return (
    <LegalPage eyebrow={m.eyebrow} title={m.shippingPolicy.title} intro={m.shippingPolicy.intro}>
      <LegalText
        sections={m.shippingPolicy.sections}
        values={{
          email: <CompanyValue field="email" />,
          deliveryPrices: (
            <Suspense fallback={<PriceLine prices={STARTING_PRICES} />}>
              <LivePrices />
            </Suspense>
          ),
          returnPolicy: (
            <Link href={RETURN_POLICY_URL} className="font-semibold text-medium-green underline underline-offset-2">
              {m.terms.returnPolicyLink}
            </Link>
          ),
        }}
      />
    </LegalPage>
  );
}
