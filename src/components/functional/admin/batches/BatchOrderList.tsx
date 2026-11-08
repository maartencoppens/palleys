import Link from "next/link";
import type { ReactNode } from "react";
import type { BatchOrderView } from "@/core/modules/batches/types";
import { Badge } from "@/components/design/Badge";

/* An order in a batch list: number, how it leaves, and its Palleys by name. Actions come in from the page. */

export function DeliveryBadge({ deliveryType }: { deliveryType: string | null }) {
  if (deliveryType === "HOME") return <Badge tone="success">Levering</Badge>;
  if (deliveryType === "PICKUP") return <Badge tone="waiting">Afhalen</Badge>;
  if (deliveryType === "HANDOVER") return <Badge tone="waiting">Overhandigen</Badge>;
  return <Badge tone="danger">{deliveryType ?? "Geen levering"}</Badge>;
}

export function BatchOrderItems({ order, itemActions }: { order: BatchOrderView; itemActions?: (item: BatchOrderView["items"][number]) => ReactNode }) {
  return (
    <ul className="flex flex-col gap-2">
      {order.items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" className="size-12 rounded-lg bg-off-white-dark object-contain" />
          ) : (
            <div className="size-12 rounded-lg bg-off-white-dark" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-semibold break-all">{item.palleyName ?? item.title}</p>
            <p className="text-xs text-text-muted">
              {item.productCode} · {item.quantity}× {item.printReady ? "" : "· nog niet printklaar"}
            </p>
          </div>
          {itemActions?.(item)}
        </li>
      ))}
    </ul>
  );
}

export function BatchOrderCard({ order, children, itemActions }: { order: BatchOrderView; children?: ReactNode; itemActions?: (item: BatchOrderView["items"][number]) => ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-off-white-dark p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/orders/${order.id}`} className="font-label text-base font-bold text-medium-green underline-offset-4 hover:underline">
          {order.number}
        </Link>
        <DeliveryBadge deliveryType={order.deliveryType} />
        <span className="text-sm text-text-muted">{order.customerName}</span>
        {order.attentionReason && <Badge tone="danger">Aandacht</Badge>}
      </div>
      {order.attentionReason && <p className="text-sm text-[#a3341a]">{order.attentionReason}</p>}
      <BatchOrderItems order={order} itemActions={itemActions} />
      {children}
    </div>
  );
}
