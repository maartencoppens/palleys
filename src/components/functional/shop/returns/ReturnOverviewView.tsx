"use client";

import Button from "@/components/design/Button";
import { Badge, type BadgeTone } from "@/components/design/Badge";
import CartLinePhoto from "@/components/functional/shop/cart/CartLinePhoto";
import { useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { formatDay, formatMoment } from "@/core/utils/format";
import { RETURN_TYPES, type ReturnItemStatus, type ReturnItemView, type ReturnOverview } from "@/core/modules/returns/types";
import { allowedQuantity } from "@/core/modules/returns/utils";
import type { ReturnStatus, ReturnType } from "@/db/generated/enums";
import { cardClassName, hintClassName } from "./styles";

const ITEM_TONE: Record<ReturnItemStatus, BadgeTone> = {
  paid: "neutral",
  in_production: "waiting",
  sent: "success",
  picked_up: "success",
  refunded: "neutral",
  cancelled: "neutral",
  request_open: "waiting",
};

const REQUEST_TONE: Record<ReturnStatus, BadgeTone> = { SUBMITTED: "waiting", APPROVED: "success", REJECTED: "danger", COMPLETED: "neutral" };

/** What the order allows, per kind of request: offered when at least one item can still go in one. */
export const offeredTypes = (items: ReturnItemView[]) =>
  RETURN_TYPES.filter((type) => items.some((item) => allowedQuantity(item.options, type) > 0));

function ItemRow({ item }: { item: ReturnItemView }) {
  const { returns: m } = useMessages();
  const locale = useLocale();
  const { options } = item;
  const can = [
    options.cancel > 0 && m.overview.canCancel,
    options.withdraw > 0 &&
      (options.withdrawalDeadline ? fill(m.overview.canWithdrawUntil, { date: formatDay(options.withdrawalDeadline, locale) }) : m.overview.canWithdraw),
    options.warranty > 0 && m.overview.canWarranty,
  ].filter(Boolean);

  return (
    <div role="listitem" className="flex gap-4 border-b border-off-white-dark py-4 last:border-b-0">
      <CartLinePhoto photoUrl={item.imageUrl} size={72} className="size-[72px] rounded-2xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-label text-sm font-bold text-text-muted">{m.overview.kinds[item.kind]}</p>
        <p className="font-label font-bold text-medium-green">{item.title}</p>
        <p className="text-sm">{fill(m.overview.quantity, { quantity: item.quantity })}</p>
        <div>
          <Badge tone={ITEM_TONE[item.status]}>{m.overview.statuses[item.status]}</Badge>
        </div>
        {can.length > 0 && <p className="text-sm font-semibold text-medium-green">{can.join(" · ")}</p>}
        {options.notices.map((notice) => (
          <p key={notice} className={hintClassName}>
            {m.overview.notices[notice]}
          </p>
        ))}
      </div>
    </div>
  );
}

/* The order behind the link: every item with what it allows, the actions, and the requests sent so far. */
export default function ReturnOverviewView({ overview, onStart }: { overview: ReturnOverview; onStart: (type: ReturnType) => void }) {
  const { returns: m } = useMessages();
  const locale = useLocale();
  const types = offeredTypes(overview.items);
  const received = overview.receivedOn;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="return-order-title" className={cardClassName}>
        <h2 id="return-order-title" tabIndex={-1} className="mt-0! outline-none">
          {fill(m.overview.title, { number: overview.orderNumber })}
        </h2>
        <p>{fill(m.overview.hello, { name: overview.firstName })}</p>
        {received && (
          <p className={hintClassName}>
            {fill(received.estimated ? m.overview.receivedEstimated : m.overview.received, { date: formatDay(received.day, locale) })}
          </p>
        )}
        <div role="list">
          {overview.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="return-actions-title" className={cardClassName}>
        <h2 id="return-actions-title" className="mt-0!">
          {m.overview.actionsTitle}
        </h2>
        {types.length === 0 ? (
          <p>{fill(m.overview.nothing, { email: overview.companyEmail })}</p>
        ) : (
          types.map((type) => (
            <div key={type} className="flex flex-col items-start gap-2 rounded-2xl bg-off-white p-4">
              <p className="text-base">{m.overview.actions[type]}</p>
              {/* LEGAL-REVIEW: the withdrawal button has to be easy to find: the primary style. */}
              <Button variant={type === "WITHDRAWAL" ? "primary" : "secondary"} onClick={() => onStart(type)}>
                {m.start[type]}
              </Button>
            </div>
          ))
        )}
      </section>

      {overview.requests.length > 0 && (
        <section aria-labelledby="return-requests-title" className={cardClassName}>
          <h2 id="return-requests-title" className="mt-0!">
            {m.overview.requestsTitle}
          </h2>
          <div role="list" className="flex flex-col gap-3">
            {overview.requests.map((request) => (
              <div role="listitem" key={request.id} className="flex flex-col gap-1 rounded-2xl bg-off-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-label font-bold">{m.types[request.type]}</p>
                  <Badge tone={REQUEST_TONE[request.status]}>{m.overview.requestStatuses[request.status]}</Badge>
                </div>
                <p className={hintClassName}>{fill(m.overview.submittedOn, { date: formatMoment(request.submittedAt, locale) })}</p>
                <p className="text-sm">{request.items.map((line) => `${line.quantity} × ${line.title}`).join(", ")}</p>
                {request.decisionNote && <p className="text-sm">{fill(m.overview.rejectedBecause, { reason: request.decisionNote })}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
