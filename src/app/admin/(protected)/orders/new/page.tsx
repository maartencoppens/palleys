import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listCollectiblesForManualOrder } from "@/core/modules/collectibles/service";
import { paymentProvider } from "@/core/modules/payments/providers";
import { getShopSettings } from "@/core/modules/settings/service";
import { getDeliveryOptions } from "@/core/modules/shipping/service";
import { ManualOrderForm } from "@/components/functional/admin/orders/ManualOrderForm";

export default async function NewOrderPage() {
  await requireAdminPage();
  const [{ catalog }, collectibles, deliveryOptions] = await Promise.all([
    getShopSettings(),
    listCollectiblesForManualOrder(),
    // Belgium is all we ship to, and the static options don't depend on the postal code.
    getDeliveryOptions({ country: "BE", postalCode: "1000" }, [{ size: "M", quantity: 1 }]),
  ]);

  return (
    <main>
      <Link
        href="/admin/orders"
        className="rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar orders
      </Link>
      <h1 className="mt-4 font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
        Order toevoegen
      </h1>
      <p className="mt-1 max-w-2xl text-base text-text-muted">
        Voor iemand die niet via de website bestelt. De order krijgt een gewoon ordernummer en doorloopt daarna dezelfde stappen.
      </p>
      <div className="mt-8">
        <ManualOrderForm
          catalog={catalog}
          collectibles={collectibles}
          deliveryOptions={deliveryOptions.map((option) => ({ id: option.id, label: option.label, priceCents: option.priceCents }))}
          paymentsAvailable={paymentProvider.isConfigured()}
        />
      </div>
    </main>
  );
}
