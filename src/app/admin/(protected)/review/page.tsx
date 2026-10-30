import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listPreviewsForReview } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";

export default async function AdminReviewPage() {
  await requireAdminPage();
  const previews = await listPreviewsForReview();

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
          Te reviewen
        </h1>
        {previews.length > 0 && (
          <p className="text-base text-text-muted">
            {previews.length === 1
              ? "1 preview wacht op goedkeuring"
              : `${previews.length} previews wachten op goedkeuring`}
            , oudste eerst
          </p>
        )}
      </div>

      {previews.length === 0 ? (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-medium-green/25 px-6 py-16 text-center">
          <p className="font-display text-2xl font-medium text-medium-green">
            Er wacht niets op goedkeuring.
          </p>
          <p className="mt-2 text-base text-text-muted">
            Nieuwe modellen verschijnen hier zodra de pipeline ze klaar heeft.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-3xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
              <tr>
                <th className="px-5 py-4 font-semibold">Foto&apos;s</th>
                <th className="px-5 py-4 font-semibold">Aangemaakt</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">E-mail</th>
                <th className="px-5 py-4 font-semibold">Fout</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Actie</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {previews.map((preview) => (
                <tr
                  key={preview.id}
                  className="border-b border-off-white-dark last:border-0 hover:bg-off-white/60"
                >
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      {preview.photoUrls.map((url, index) => (
                        /* Bewust <img>, niet next/image: klantfoto's (GDPR). */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt={`Foto ${index + 1}`}
                          loading="lazy"
                          className="size-12 rounded-xl bg-off-white-dark object-cover"
                        />
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                    {formatDateTime(preview.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <PreviewStatusBadge status={preview.status} />
                  </td>
                  <td className="px-5 py-4 font-semibold">{preview.email ?? "—"}</td>
                  <td
                    className="max-w-xs truncate px-5 py-4 text-text-muted"
                    title={preview.error ?? undefined}
                  >
                    {preview.error ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/previews/${preview.id}`}
                      className="rounded font-label font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
                    >
                      Bekijken
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
