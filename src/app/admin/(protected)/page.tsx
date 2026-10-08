import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/core/modules/auth/service";
import { getAdminDashboard } from "@/core/modules/previews/service";
import { formatDateTime } from "@/core/utils/format";
import { StatCard } from "@/components/design/StatCard";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";

const searchSchema = z.object({ q: z.string().max(200).optional() });

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  await requireAdminPage();
  const parsed = searchSchema.safeParse(await searchParams);
  const { stats, query, results } = await getAdminDashboard(
    parsed.success ? parsed.data.q : "",
  );

  return (
    <main>
      <h1 className="text-4xl font-semibold tracking-tight font-stretch-semi-condensed">
        Dashboard
      </h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Te reviewen"
          value={stats.toReview}
          href="/admin/review"
        />
        <StatCard
          label="Nog te downloaden"
          value={stats.toDownload}
          href="/admin/approved"
        />
        <StatCard
          label="Mislukt"
          value={stats.failed}
          href="/admin/review"
          tone="danger"
        />
        <StatCard
          label="Goedgekeurd (totaal)"
          value={stats.approved}
          href="/admin/approved"
        />
      </div>

      <section className="mt-10">
        <h2 className="font-semibold">Preview zoeken</h2>
        <form className="mt-3 flex gap-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Ordernummer, e-mail of preview-id"
            className="w-full max-w-md rounded-md border border-line bg-surface px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Zoeken
          </button>
        </form>

        {query && results.length === 0 && (
          <p className="mt-4 text-sm text-muted">
            Niets gevonden voor “{query}”.
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
            {results.map((preview) => (
              <li key={preview.id}>
                <Link
                  href={`/admin/previews/${preview.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-canvas"
                >
                  <span className="tabular-nums text-muted">
                    {formatDateTime(preview.createdAt)}
                  </span>
                  <PreviewStatusBadge status={preview.status} />
                  <span>{preview.email ?? "—"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
