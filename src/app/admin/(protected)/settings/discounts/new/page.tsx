import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { DiscountForm } from "@/components/functional/admin/settings/DiscountForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

export default async function NewDiscountPage() {
  await requireAdminPage();
  return (
    <>
      <Link
        href="/admin/settings/discounts"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar kortingscodes
      </Link>
      <SettingsHeader title="Code aanmaken" />
      <DiscountForm />
    </>
  );
}
