import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getPreviewForAdmin } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { ModelViewer } from "@/components/functional/admin/ModelViewer";
import { ApprovePreviewButton } from "@/components/functional/admin/ApprovePreviewButton";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";
import { GeneratePoseButton } from "@/components/functional/admin/GeneratePoseButton";
import { GenerateModelButton } from "@/components/functional/admin/GenerateModelButton";
import { SyncModelButton } from "@/components/functional/admin/SyncModelButton";
import { getShopSettings } from "@/core/modules/settings/service";
import { AnimalTypePicker } from "@/components/functional/admin/AnimalTypePicker";
import { AttachModelButton } from "@/components/functional/admin/AttachModelButton";
import { PreviewPromptEditor } from "@/components/functional/admin/PreviewPromptEditor";
import { PhotoManager } from "@/components/functional/admin/PhotoManager";
import { PoseCandidates } from "@/components/functional/admin/PoseCandidates";
import { StatusOverridePanel } from "@/components/functional/admin/StatusOverridePanel";
import type { MeshyProgress } from "@/core/modules/previews/types";

export const instant = false;

const paramsSchema = z.object({ id: z.uuid() });

export default async function AdminPreviewDetailPage({
  params,
}: PageProps<"/admin/previews/[id]">) {
  await requireAdminPage();

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const [preview, { catalog }] = await Promise.all([getPreviewForAdmin(parsed.data.id), getShopSettings()]);
  if (!preview) notFound();
  // A preview from before an animal was removed keeps its code: show it as a choice so it stays visible.
  const animals =
    preview.animalType && !catalog.animals.some((animal) => animal.code === preview.animalType)
      ? [...catalog.animals, { value: preview.animalType.toLowerCase(), code: preview.animalType, labels: { nl: preview.animalType, en: preview.animalType } }]
      : catalog.animals;

  return (
    <main>
      <Link
        href={preview.order ? `/admin/orders/${preview.order.id}` : "/admin"}
        className="rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        {preview.order ? `Terug naar order ${preview.order.number}` : "Terug naar overzicht"}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
          Preview
        </h1>
        <PreviewStatusBadge status={preview.status} />
        {preview.forCollectible && <Badge tone="success">Nieuwe collectible</Badge>}
      </div>
      <p className="mt-1 break-all font-mono text-sm text-text-muted">{preview.id}</p>

      {/* On a phone: the model, then the photos, then the actions, with the emergency status last. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        {preview.glbUrl ? (
          <ModelViewer
            src={preview.glbUrl}
            alt={`3D-model van preview ${preview.id}`}
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-3xl border-2 border-dashed border-medium-green/25 text-base text-text-muted sm:h-[480px]">
            Nog geen 3D-model voor deze preview.
          </div>
        )}
        <div className="order-3 lg:order-none">
          <StatusOverridePanel
            previewId={preview.id}
            currentStatus={preview.status}
            history={preview.statusChanges}
          />
        </div>
        <aside className="order-2 space-y-6 lg:order-none lg:row-span-2">
          {preview.forCollectible && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-xl font-medium text-medium-green">Nieuwe collectible</h2>
              <p className="mt-2 text-sm text-text-muted">
                Los van een order. Zodra de printklare zip op Processed staat, komt het model vanzelf op de collectible.
              </p>
              {preview.collectibleId && (
                <Link
                  href={`/admin/settings/collectibles/${preview.collectibleId}`}
                  className="mt-3 inline-block font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange"
                >
                  Naar de collectible
                </Link>
              )}
              {preview.canAttachModel && <AttachModelButton previewId={preview.id} />}
            </section>
          )}
          {preview.forCollectible && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-xl font-medium text-medium-green">Prompt</h2>
              <p className="mt-2 text-sm text-text-muted">
                Alleen voor dit model. Pas aan en maak een nieuwe pose; de instellingen blijven zoals ze zijn.
              </p>
              <PreviewPromptEditor previewId={preview.id} prompt={preview.prompt} />
            </section>
          )}
          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-display text-xl font-medium text-medium-green">Gegevens</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-label font-semibold text-text-muted">Aangemaakt</dt>
                <dd className="tabular-nums">
                  {formatDateTime(preview.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="font-label font-semibold text-text-muted">E-mail</dt>
                <dd className="break-words">{preview.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-label font-semibold text-text-muted">Order</dt>
                <dd>
                  {preview.order ? (
                    <Link
                      href={`/admin/orders/${preview.order.id}`}
                      className="font-semibold text-medium-green underline underline-offset-4 hover:text-orange"
                    >
                      {preview.order.number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-label font-semibold text-text-muted">Printnaam</dt>
                <dd className="break-all font-mono text-xs">{preview.printName}</dd>
              </div>
              {preview.order?.notes && (
                <div>
                  <dt className="font-label font-semibold text-text-muted">Opmerking klant</dt>
                  <dd className="break-words italic">“{preview.order.notes}”</dd>
                </div>
              )}
              <div>
                <dt className="font-label font-semibold text-text-muted">Aantal</dt>
                <dd>
                  {preview.quantity > 1 ? (
                    <Badge tone="waiting">{preview.quantity}× printen</Badge>
                  ) : (
                    "1"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-label font-semibold text-text-muted">Meshy-taak</dt>
                <dd className="break-all font-mono text-xs">
                  {preview.meshyTaskId ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          {preview.error && (
            <section className="rounded-3xl bg-pink p-6 text-sm text-[#a3341a]">
              <h2 className="font-display text-xl font-medium">Fout in de pipeline</h2>
              <p className="mt-1 break-words">{preview.error}</p>
            </section>
          )}

          {preview.canGeneratePose && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-xl font-medium text-medium-green">Pose</h2>
              <p className="mt-1 text-sm leading-[1.5] text-text-muted">
                {preview.poseImageUrl
                  ? "Niet tevreden met de pose? Genereer een nieuwe versie."
                  : "Genereer de pose-afbeelding op basis van de originele foto."}
                {preview.poseCandidates.length > 0 && " Eerdere poses blijven staan om te vergelijken."}
              </p>
              <GeneratePoseButton
                previewId={preview.id}
                hasPose={Boolean(preview.poseImageUrl)}
                attemptsLeft={preview.poseAttemptsLeft}
              />
            </section>
          )}
          {(preview.canStartModel || preview.canSyncModel) && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-xl font-medium text-medium-green">3D-model</h2>
              {preview.canSyncModel ? (
                <>
                  <p className="mt-1 text-sm leading-[1.5] text-text-muted">
                    Meshy maakt het model. Dit duurt enkele minuten. Ververs de
                    pagina of haal de status zelf op.
                  </p>
                  {preview.meshyProgress && (
                    <p className="mt-2 font-label text-sm font-bold text-medium-green tabular-nums">
                      {meshyProgressLabel(preview.meshyProgress)}
                    </p>
                  )}
                  <SyncModelButton previewId={preview.id} />
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm leading-[1.5] text-text-muted">
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
          <section className="rounded-3xl bg-white p-6">
            <h2 className="font-display text-xl font-medium text-medium-green">Diersoort</h2>
            <p className="mt-1 text-sm leading-[1.5] text-text-muted">
              Komt in de bestandsnaam van de print. Nodig om goed te keuren.
            </p>
            <AnimalTypePicker
              previewId={preview.id}
              value={preview.animalType}
              animals={animals}
            />
          </section>
          {preview.canApprove && (
            <section className="rounded-3xl bg-white p-6">
              <h2 className="font-display text-xl font-medium text-medium-green">Goedkeuren</h2>
              <p className="mt-1 text-sm leading-[1.5] text-text-muted">
                Ziet het model er goed uit? Na goedkeuring gaat het naar de
                printvoorbereiding.
              </p>
              <ApprovePreviewButton previewId={preview.id} />
            </section>
          )}
        </aside>

        <div className="order-1 space-y-8 lg:order-none">
          <PhotoManager
            previewId={preview.id}
            photos={preview.photos}
            canAdd={preview.canAddPhoto}
            canDelete={preview.canDeletePhoto}
          />
          <PoseCandidates
            previewId={preview.id}
            photoUrls={preview.photos.map((photo) => photo.url)}
            candidates={preview.poseCandidates}
            canApprove={preview.canApprovePose}
            canUpload={preview.canUploadPose}
            uploadsLeft={preview.uploadedPosesLeft}
          />
        </div>
      </div>
    </main>
  );
}

function meshyProgressLabel(meshy: MeshyProgress) {
  if (meshy.status === "PENDING") {
    return meshy.precedingTasks
      ? `Meshy: in de wachtrij (${meshy.precedingTasks} voor jou)`
      : "Meshy: in de wachtrij";
  }
  if (meshy.status === "IN_PROGRESS") {
    return `Meshy: ${meshy.progress ?? 0}%`;
  }
  // SUCCEEDED of FAILED: klaar bij Meshy, nog niet bij ons opgehaald.
  return `Meshy: ${meshy.status.toLowerCase()} — haal de status op`;
}
