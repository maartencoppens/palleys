import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getPreviewForAdmin } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { ModelViewer } from "@/components/functional/admin/ModelViewer";
import { ApprovePreviewButton } from "@/components/functional/admin/ApprovePreviewButton";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";
import { GeneratePoseButton } from "@/components/functional/admin/GeneratePoseButton";
import { GenerateModelButton } from "@/components/functional/admin/GenerateModelButton";
import { SyncModelButton } from "@/components/functional/admin/SyncModelButton";

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
      <Link
        href="/admin"
        className="rounded text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        Terug naar overzicht
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
          Preview
        </h1>
        <PreviewStatusBadge status={preview.status} />
      </div>
      <p className="mt-1 break-all text-sm text-muted">{preview.id}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        {preview.glbUrl ? (
          <ModelViewer
            src={preview.glbUrl}
            alt={`3D-model van preview ${preview.id}`}
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted sm:h-[480px]">
            Nog geen 3D-model voor deze preview.
          </div>
        )}

        <aside className="space-y-6 lg:row-span-2">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-semibold">Gegevens</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-muted">Aangemaakt</dt>
                <dd className="tabular-nums">
                  {formatDateTime(preview.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">E-mail</dt>
                <dd className="break-words">{preview.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Shopify-order</dt>
                <dd>{preview.shopifyOrderId ?? "—"}</dd>
              </div>
            </dl>
          </section>

          {preview.error && (
            <section className="rounded-lg bg-danger-soft p-5 text-sm text-danger">
              <h2 className="font-semibold">Fout in de pipeline</h2>
              <p className="mt-1 break-words">{preview.error}</p>
            </section>
          )}

          {preview.canGeneratePose && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-semibold">Pose</h2>
              <p className="mt-1 text-sm text-muted">
                {preview.poseImageUrl
                  ? "Niet tevreden met de pose? Genereer een nieuwe versie."
                  : "Genereer de pose-afbeelding op basis van de originele foto."}
              </p>
              <GeneratePoseButton
                previewId={preview.id}
                hasPose={Boolean(preview.poseImageUrl)}
                attemptsLeft={preview.poseAttemptsLeft}
              />
            </section>
          )}
          {(preview.canStartModel || preview.canSyncModel) && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-semibold">3D-model</h2>
              {preview.canSyncModel ? (
                <>
                  <p className="mt-1 text-sm text-muted">
                    Meshy maakt het model. Dit duurt enkele minuten. Ververs de
                    pagina of haal de status zelf op.
                  </p>
                  <SyncModelButton previewId={preview.id} />
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-muted">
                    {preview.glbUrl
                      ? "Niet tevreden met het model? Laat een nieuw maken op basis van de huidige pose."
                      : "Is de pose goed? Dan maakt Meshy er een 3D-model van."}
                  </p>
                  <GenerateModelButton
                    previewId={preview.id}
                    hasModel={Boolean(preview.glbUrl)}
                  />
                </>
              )}
            </section>
          )}
          {preview.canApprove && (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-semibold">Goedkeuren</h2>
              <p className="mt-1 text-sm text-muted">
                Ziet het model er goed uit? Na goedkeuring gaat het naar de
                printvoorbereiding.
              </p>
              <ApprovePreviewButton previewId={preview.id} />
            </section>
          )}
        </aside>

        <div className="grid grid-cols-2 gap-4">
          <Photo url={preview.originalPhotoUrl} caption="Originele foto" />
          <Photo url={preview.poseImageUrl} caption="Pose" />
        </div>
      </div>
    </main>
  );
}

type PhotoProps = {
  url: string | null;
  caption: string;
};

function Photo({ url, caption }: PhotoProps) {
  return (
    <figure>
      {url ? (
        /* Bewust <img> en geen next/image: die zou de klantfoto via de
           image optimizer van de server proxyen en cachen (GDPR). */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={caption}
          className="aspect-[4/3] w-full rounded-lg border border-line bg-surface object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
          Nog niet beschikbaar
        </div>
      )}
      <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
