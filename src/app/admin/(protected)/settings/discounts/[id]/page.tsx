import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getDiscountForAdmin } from "@/core/modules/discounts/service";
import { DiscountForm } from "@/components/functional/admin/settings/DiscountForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const paramsSchema = z.object({ id: z.uuid() });

export default async function EditDiscountPage({ params }: PageProps<"/admin/settings/discounts/[id]">) {
  await requireAdminPage();
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const discount = await getDiscountForAdmin(parsed.data.id);
  if (!discount) notFound();
  return (
    <>
      <Link
        href="/admin/settings/discounts"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar kortingscodes
      </Link>
      <SettingsHeader title={discount.code} />
      <DiscountForm discount={discount} />
    </>
  );
}
