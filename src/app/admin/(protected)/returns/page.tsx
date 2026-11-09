import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { listReturnRequests } from "@/core/modules/returns/service";
import { ReturnRequestCard } from "@/components/functional/admin/returns/ReturnRequestCard";

export const instant = false;

/* Cancellations, withdrawals and warranty claims from /retour. Open ones first; the order page has the full story. */
export default async function AdminReturnsPage({ searchParams }: PageProps<"/admin/returns">) {
  await requireAdminPage();
  const all = (await searchParams).alle !== undefined;
  const requests = await listReturnRequests({ open: !all });

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">Retour</h1>
        <Link href={all ? "/admin/returns" : "/admin/returns?alle"} className="font-label font-bold text-medium-green underline underline-offset-4">
          {all ? "Alleen openstaande" : "Alle aanvragen"}
        </Link>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        {all
          ? "De laatste 100 aanvragen, nieuwste eerst."
          : "Nog af te handelen, oudste eerst. Terugbetalen gebeurt in het Bancontact Pro-portaal; zet de aanvraag daarna op afgerond."}
      </p>
      {requests.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-white p-6">Geen {all ? "" : "openstaande "}aanvragen.</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <ReturnRequestCard key={request.id} request={request} showOrder />
          ))}
        </div>
      )}
    </main>
  );
}
