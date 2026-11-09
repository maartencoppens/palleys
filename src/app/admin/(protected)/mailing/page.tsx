import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listSubscribers } from "@/core/modules/newsletter/service";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { UnsubscribeButton } from "@/components/functional/admin/newsletter/UnsubscribeButton";

export const instant = false;

/* Who ticked "keep me posted" in the checkout. Nothing is sent from the site yet: export the list for a mailing tool. */
export default async function AdminMailingPage({ searchParams }: PageProps<"/admin/mailing">) {
  await requireAdminPage();
  const all = (await searchParams).alle !== undefined;
  const { subscribers, activeCount } = await listSubscribers({ all });

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">Mailinglijst</h1>
        <div className="flex flex-wrap items-center gap-5">
          <Link href={all ? "/admin/mailing" : "/admin/mailing?alle"} className="font-label font-bold text-medium-green underline underline-offset-4">
            {all ? "Alleen ingeschreven" : "Ook uitgeschreven"}
          </Link>
          {/* A plain link: the browser downloads the file, with the admin session cookie. */}
          <a
            href="/api/admin/newsletter/export"
            download
            className="rounded-pill bg-orange px-6 py-3 font-label text-base font-semibold text-off-white transition hover:bg-orange-hover"
          >
            Exporteer CSV
          </a>
        </div>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        {activeCount === 1 ? "1 ingeschreven adres" : `${activeCount} ingeschreven adressen`}, via het vinkje in de checkout. De export
        bevat enkel wie nog ingeschreven is. Vraagt iemand om uitgeschreven te worden, zet het adres hier op uitgeschreven.
      </p>

      {subscribers.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-white p-6">Nog niemand op de mailinglijst.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
          <table className="admin-table w-full text-left text-sm">
            <thead className="border-b-[1.5px] border-off-white-dark font-label text-text-muted">
              <tr>
                <th className="px-5 py-4 font-semibold">E-mailadres</th>
                <th className="px-5 py-4 font-semibold">Taal</th>
                <th className="px-5 py-4 font-semibold">Ingeschreven</th>
                {all && <th className="px-5 py-4 font-semibold">Status</th>}
                <th className="px-5 py-4">
                  <span className="sr-only">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="border-b border-off-white-dark last:border-0 hover:bg-off-white/60">
                  <td className="px-5 py-3 font-semibold break-all">{subscriber.email}</td>
                  <td data-label="Taal" className="px-5 py-3 uppercase">{subscriber.locale}</td>
                  <td data-label="Ingeschreven" className="whitespace-nowrap px-5 py-3 tabular-nums">
                    {formatDateTime(subscriber.subscribedAt.toISOString())}
                  </td>
                  {all && (
                    <td data-label="Status" className="px-5 py-3">
                      {subscriber.unsubscribedAt ? (
                        <Badge tone="neutral">Uitgeschreven</Badge>
                      ) : (
                        <Badge tone="success">Ingeschreven</Badge>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    {!subscriber.unsubscribedAt && <UnsubscribeButton id={subscriber.id} email={subscriber.email} />}
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
