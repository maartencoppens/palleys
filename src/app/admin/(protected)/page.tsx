import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listPreviewsForReview } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { PreviewStatusBadge } from "@/components/functional/PreviewStatusBadge";

export default async function AdminHomePage() {
  await requireAdminPage();
  const previews = await listPreviewsForReview();

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
          Te reviewen
        </h1>
        {previews.length > 0 && (
          <p className="text-sm text-muted">
            {previews.length === 1
              ? "1 preview wacht op goedkeuring"
              : `${previews.length} previews wachten op goedkeuring`}
            , oudste eerst
          </p>
        )}
      </div>

      {previews.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line px-6 py-16 text-center">
          <p className="font-medium">Er wacht niets op goedkeuring.</p>
          <p className="mt-1 text-sm text-muted">
            Nieuwe modellen verschijnen hier zodra de pipeline ze klaar heeft.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Aangemaakt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Fout</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actie</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {previews.map((preview) => (
                <tr
                  key={preview.id}
                  className="border-b border-line last:border-0 hover:bg-canvas/60"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {formatDateTime(preview.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <PreviewStatusBadge status={preview.status} />
                  </td>
                  <td className="px-4 py-3">{preview.email ?? "—"}</td>
                  <td
                    className="max-w-xs truncate px-4 py-3 text-muted"
                    title={preview.error ?? undefined}
                  >
                    {preview.error ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/previews/${preview.id}`}
                      className="rounded font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
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
