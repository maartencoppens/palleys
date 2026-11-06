import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listDiscountsForAdmin } from "@/core/modules/discounts/service";
import type { AdminDiscount } from "@/core/modules/discounts/types";
import { formatDateTime, formatPrice } from "@/core/utils/format";
import { Badge, type BadgeTone } from "@/components/design/Badge";
import Button from "@/components/design/Button";
import { DiscountDeleteButton } from "@/components/functional/admin/settings/DiscountDeleteButton";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const STATE: Record<AdminDiscount["state"], { label: string; tone: BadgeTone }> = {
  active: { label: "Actief", tone: "success" },
  scheduled: { label: "Gepland", tone: "waiting" },
  off: { label: "Uit", tone: "neutral" },
  expired: { label: "Verlopen", tone: "neutral" },
  used_up: { label: "Op", tone: "danger" },
};

function conditions(discount: AdminDiscount) {
  return [
    discount.minSubtotalCents > 0 && `vanaf ${formatPrice(discount.minSubtotalCents / 100)}`,
    discount.personalDelivery && "gratis persoonlijk overhandigen",
    discount.oncePerEmail && "1× per e-mailadres",
    discount.startsAt && `vanaf ${formatDateTime(discount.startsAt)}`,
    discount.expiresAt && `tot ${formatDateTime(discount.expiresAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminDiscountsPage() {
  await requireAdminPage();
  const discounts = await listDiscountsForAdmin();

  return (
    <>
      <SettingsHeader
        title="Kortingscodes"
        intro="Klanten vullen de code in bij het afrekenen. De korting geldt op de producten, niet op de verzending. Een onbetaalde bestelling houdt de code bezet tot ze sluit."
        action={
          <Button variant="primary" href="/admin/settings/discounts/new">
            Code aanmaken
          </Button>
        }
      />

      {discounts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-16 text-center">
          <p className="font-display text-2xl font-medium text-medium-green">Nog geen kortingscodes.</p>
          <p className="mt-2 text-base text-text-muted">Maak de eerste aan, bijvoorbeeld een code voor je nieuwsbrief.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white">
          <table className="admin-table w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
              <tr>
                <th className="px-5 py-4 font-semibold">Code</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Korting</th>
                <th className="px-5 py-4 text-right font-semibold">Gebruikt</th>
                <th className="px-5 py-4 text-right font-semibold">Gegeven</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id} className="border-b border-off-white-dark last:border-0 hover:bg-off-white/60">
                  <td className="px-5 py-3">
                    <p className="font-mono font-semibold">{discount.code}</p>
                    {conditions(discount) && <p className="text-xs text-text-muted">{conditions(discount)}</p>}
                    {discount.note && <p className="text-xs text-text-muted">{discount.note}</p>}
                  </td>
                  <td data-label="Status" className="px-5 py-3">
                    <Badge tone={STATE[discount.state].tone}>{STATE[discount.state].label}</Badge>
                  </td>
                  <td data-label="Korting" className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums">{discount.label}</td>
                  <td data-label="Gebruikt" className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                    {discount.redemptions}
                    {discount.maxRedemptions !== null && ` / ${discount.maxRedemptions}`}
                  </td>
                  <td data-label="Gegeven" className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                    {formatPrice(discount.paidDiscountCents / 100)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <div className="flex justify-end gap-4">
                      <Link
                        href={`/admin/settings/discounts/${discount.id}`}
                        className="rounded font-label font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
                      >
                        Bewerken
                      </Link>
                      <DiscountDeleteButton id={discount.id} code={discount.code} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
