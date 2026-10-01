import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getPreviewForAdmin } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { ModelViewer } from "@/components/functional/ModelViewer";
import { ApprovePreviewButton } from "@/components/functional/ApprovePreviewButton";

const paramsSchema = z.object({ id: z.uuid() });

export default async function AdminPreviewDetailPage({
  params,
}: PageProps<"/admin/previews/[id]">) {
  await requireAdminPage();

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const preview = await getPreviewForAdmin(parsed.data.id);
  if (!preview) notFound();

  return (
    <main>
      <h1>Preview {preview.id}</h1>

      <dl>
        <dt>Status</dt>
        <dd>{preview.status}</dd>
        <dt>Aangemaakt</dt>
        <dd>{formatDateTime(preview.createdAt)}</dd>
        <dt>E-mail</dt>
        <dd>{preview.email ?? "—"}</dd>
        <dt>Shopify-order</dt>
        <dd>{preview.shopifyOrderId ?? "—"}</dd>
        {preview.error && (
          <>
            <dt>Fout</dt>
            <dd>{preview.error}</dd>
          </>
        )}
      </dl>

      <section>
        <h2>Foto&apos;s</h2>
        {/* Bewust <img> en geen next/image: die zou de klantfoto via de
            image optimizer van de server proxyen en cachen (GDPR). */}
        {preview.originalPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.originalPhotoUrl}
            alt="Originele foto"
            width={320}
          />
        )}
        {preview.poseImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.poseImageUrl} alt="Pose-afbeelding" width={320} />
        )}
      </section>

      <section>
        <h2>3D-model</h2>
        {preview.glbUrl ? (
          <ModelViewer
            src={preview.glbUrl}
            alt={`3D-model van preview ${preview.id}`}
          />
        ) : (
          <p>Nog geen model beschikbaar.</p>
        )}
      </section>

      {preview.canApprove && <ApprovePreviewButton previewId={preview.id} />}
    </main>
  );
}
