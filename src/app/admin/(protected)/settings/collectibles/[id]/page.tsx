import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getShopSettings } from "@/core/modules/settings/service";
import { getCollectibleForAdmin, getCollectibleModels } from "@/core/modules/collectibles/service";
import { CollectibleForm } from "@/components/functional/admin/settings/CollectibleForm";
import { CollectibleModels } from "@/components/functional/admin/settings/CollectibleModels";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const paramsSchema = z.object({ id: z.uuid() });

export default async function EditCollectiblePage({ params }: PageProps<"/admin/settings/collectibles/[id]">) {
  await requireAdminPage();
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const [collectible, { catalog }] = await Promise.all([getCollectibleForAdmin(parsed.data.id), getShopSettings()]);
  if (!collectible) notFound();
  const models = await getCollectibleModels(collectible.id);
  return (
    <>
      <Link
        href="/admin/settings/collectibles"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar collectibles
      </Link>
      <SettingsHeader title={collectible.name} />
      <CollectibleModels
        collectibleId={collectible.id}
        versions={models.versions}
        generations={models.generations}
        archived={collectible.archivedAt !== null}
      />
      <CollectibleForm collectible={collectible} animals={catalog.animals} />
    </>
  );
}
