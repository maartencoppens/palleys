/*
 * Every comment on a Palley in one list for post-production, from the customer to the team, oldest first. Pure: the
 * batches service passes the rows it already loads. Only written text: the automatic order log stays on the order page.
 */

export type PalleyCommentSource = "customer" | "team" | "model";

export type PalleyComment = {
  source: PalleyCommentSource;
  /** What kind of comment, in Dutch: "Klant", "Teamnotitie", "Model: In Blender → Klaar voor print"… */
  label: string;
  text: string;
  /** Who wrote it (an admin's name), when known. */
  by: string | null;
  /** ISO time, when known. */
  at: string | null;
};

type ItemRow = {
  notes: string | null;
  preview: { statusChanges: { reason: string; changedBy: string; createdAt: Date; toStatus: string }[] } | null;
};

type OrderRow = {
  /** Set when an admin added the order: the item notes were typed in the backoffice, not by a customer. */
  createdBy: string | null;
  paidAt: Date | null;
  createdAt: Date;
  adminNotes: string | null;
  adminNotesUpdatedBy: string | null;
  adminNotesUpdatedAt: Date | null;
  statusChanges: { note: string | null; source: string; createdAt: Date }[];
};

const ADMIN_SOURCE = /^admin:(.+)$/;

/*
 * Order log notes that hold text an admin typed (a reason), not just what the system did. The rest of the log (put in a
 * batch, mailed, checked in…) stays on the order page.
 */
const TYPED_ORDER_NOTES = [/^Probleem afgehandeld: /, /^Uit .+ gehaald: /, /^Handmatig doorgezet naar .+ Reden: /];

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;
const byTime = (a: PalleyComment, b: PalleyComment) => (a.at ?? "").localeCompare(b.at ?? "");

/** About one Palley: what the customer wrote with it, and the reasons the team gave when changing its model's status. */
export function palleyComments(item: ItemRow, order: Pick<OrderRow, "createdBy" | "paidAt" | "createdAt">): PalleyComment[] {
  const comments: PalleyComment[] = [];
  const notes = item.notes?.trim();
  if (notes) {
    comments.push(
      order.createdBy
        ? { source: "team", label: "Bij het aanmaken (backoffice)", text: notes, by: order.createdBy, at: iso(order.createdAt) }
        : { source: "customer", label: "Klant", text: notes, by: null, at: iso(order.paidAt ?? order.createdAt) },
    );
  }
  for (const change of item.preview?.statusChanges ?? []) {
    const text = change.reason.trim();
    if (text) comments.push({ source: "model", label: "Model", text, by: change.changedBy, at: iso(change.createdAt) });
  }
  return comments.sort(byTime);
}

/** About the whole order: the team's notepad and the reasons typed in the order log. */
export function orderComments(order: OrderRow): PalleyComment[] {
  const comments: PalleyComment[] = [];
  const notes = order.adminNotes?.trim();
  if (notes) {
    comments.push({ source: "team", label: "Teamnotitie", text: notes, by: order.adminNotesUpdatedBy, at: iso(order.adminNotesUpdatedAt) });
  }
  for (const change of order.statusChanges) {
    const admin = ADMIN_SOURCE.exec(change.source);
    const note = change.note?.trim();
    if (!admin || !note || !TYPED_ORDER_NOTES.some((pattern) => pattern.test(note))) continue;
    comments.push({ source: "team", label: "Orderlog", text: note, by: admin[1], at: iso(change.createdAt) });
  }
  return comments.sort(byTime);
}
