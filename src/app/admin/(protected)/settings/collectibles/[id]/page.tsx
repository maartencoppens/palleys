import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getCollectibleForAdmin } from "@/core/modules/collectibles/service";
import { CollectibleForm } from "@/components/functional/admin/settings/CollectibleForm";
import { SettingsHeader } from "@/components/functional/admin/settings/SettingsParts";

export const instant = false;

const paramsSchema = z.object({ id: z.uuid() });

export default async function EditCollectiblePage({ params }: PageProps<"/admin/settings/collectibles/[id]">) {
  await requireAdminPage();
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const collectible = await getCollectibleForAdmin(parsed.data.id);
  if (!collectible) notFound();
  return (
    <>
      <Link
        href="/admin/settings/collectibles"
        className="w-fit rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar collectibles
      </Link>
      <SettingsHeader title={collectible.name} />
      {collectible.sourcePreviewId && (
        <p className="-mt-2 text-sm text-text-muted">
          {collectible.modelKey ? "Gegenereerd met de AI-pipeline." : "Het model wordt nog gegenereerd."}{" "}
          <Link
            href={`/admin/previews/${collectible.sourcePreviewId}`}
            className="font-label font-bold text-medium-green underline underline-offset-4 hover:text-orange"
          >
            Naar de preview
          </Link>
        </p>
      )}
      <CollectibleForm collectible={collectible} />
    </>
  );
}
