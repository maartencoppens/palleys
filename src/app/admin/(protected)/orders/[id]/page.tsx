import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/core/modules/auth/service";
import { itemStage, nextStepLabel, OPEN_ORDER_STATUSES, summarizeCheckIn } from "@/core/modules/orders/check-in";
import { getOrderForAdmin } from "@/core/modules/orders/service";
import { paymentProvider } from "@/core/modules/payments/providers";
import { formatDateTime, formatPrice } from "@/core/utils/format";
import { isPersonalDelivery } from "@/data/shipping";
import { attachments } from "@/data/options";
import { MANUAL_PAYMENT_PROVIDER, PAYMENT_METHOD_LABELS } from "@/data/payment-methods";
import { Badge } from "@/components/design/Badge";
import { OrderActions } from "@/components/functional/admin/OrderActions";
import { CollectibleModelButton } from "@/components/functional/admin/orders/CollectibleModelButton";
import { ItemCheckInButton } from "@/components/functional/admin/orders/ItemCheckInButton";
import { OrderPaymentPanel } from "@/components/functional/admin/orders/OrderPaymentPanel";
import { OrderProgressPanel } from "@/components/functional/admin/orders/OrderProgressPanel";
import { OrderStatusBadge, orderStatusLabel, PaymentStatusBadge } from "@/components/functional/admin/OrderStatusBadge";
import { PhotoThumbnails } from "@/components/functional/admin/PhotoThumbnails";
import { PreviewStatusBadge } from "@/components/functional/admin/PreviewStatusBadge";

export const instant = false;

const euro = (cents: number) => formatPrice(cents / 100);

export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  const confirmable = ["PAID", "IN_PRODUCTION", "SHIPPED"].includes(order.status);
  const open = OPEN_ORDER_STATUSES.includes(order.status);
  const checkInItems = order.items.map((item) => ({ previewStatus: item.previewStatus, checkedInAt: item.checkedInAt }));
  const summary = summarizeCheckIn(checkInItems);
  const handover = isPersonalDelivery(order.shipment?.deliveryType);
  const paidManually = order.payments.some((payment) => payment.provider === MANUAL_PAYMENT_PROVIDER && payment.status === "PAID");
  const hasProviderPayment = order.payments.some((payment) => payment.provider !== MANUAL_PAYMENT_PROVIDER);
  const openPaymentLink = order.payments.find((payment) => payment.checkoutUrl)?.checkoutUrl ?? null;

  return (
    <main>
      <Link
        href="/admin/orders"
        className="rounded font-label text-base font-bold text-medium-green underline underline-offset-4 transition-colors hover:text-orange"
      >
        Terug naar orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
          {order.number}
        </h1>
        <OrderStatusBadge status={order.status} />
        {order.createdBy && <Badge>Handmatig toegevoegd door {order.createdBy}</Badge>}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Besteld {formatDateTime(order.createdAt)}
        {order.paidAt && ` · betaald ${formatDateTime(order.paidAt)}`}
      </p>

      {order.attentionReason && (
        <section role="alert" className="mt-6 rounded-3xl bg-pink p-6 text-sm text-[#a3341a]">
          <h2 className="font-display text-xl font-medium">Opvolgen</h2>
          <p className="mt-1 break-words">{order.attentionReason}</p>
        </section>
      )}

      {/* On a phone the two columns dissolve: first the products, then what to do next, and the records last. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <section className="-order-1 rounded-3xl bg-white p-5 sm:p-6 lg:order-none">
            <h2 className="font-display text-xl font-medium text-medium-green">Producten</h2>
            <ul className="mt-4 divide-y divide-off-white-dark">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-4 py-4 first:pt-0 last:pb-0">
                  {item.photoUrls.length > 0 ? (
                    <PhotoThumbnails urls={item.photoUrls} limit={1} className="size-16" />
                  ) : item.photoUrl ? (
                    /* Bewust <img>, niet next/image: klantfoto's (GDPR). */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photoUrl}
                      alt=""
                      className={`size-16 rounded-xl bg-off-white-dark ${item.kind === "collectible" ? "object-contain" : "object-cover"}`}
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-off-white-dark" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-label text-base font-bold">
                      {item.title} × {item.quantity}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {item.sku} · maat {item.size}
                    </p>
                    {/* A Palley has it in its title. */}
                    {item.kind === "collectible" && item.attachment && (
                      <p className="text-sm">Bevestiging: {attachments.find((option) => option.value === item.attachment)?.label ?? item.attachment}</p>
                    )}
                    {item.notes && <p className="text-sm italic">“{item.notes}”</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {item.previewId && item.previewStatus ? (
                        <>
                          <PreviewStatusBadge status={item.previewStatus} />
                          <Link
                            href={`/admin/previews/${item.previewId}`}
                            className="font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange"
                          >
                            {item.photoUrl ? "Naar preview" : "Foto's toevoegen"}
                          </Link>
                        </>
                      ) : item.collectibleId && item.collectibleHasModel ? (
                        <>
                          <Badge tone="success">Collectible, vast 3D-model</Badge>
                          <CollectibleModelButton collectibleId={item.collectibleId} />
                        </>
                      ) : (
                        <>
                          <Badge tone="waiting">Collectible zonder 3D-model</Badge>
                          {item.collectibleId && (
                            <Link
                              href={`/admin/settings/collectibles/${item.collectibleId}`}
                              className="font-label text-sm font-bold text-medium-green underline underline-offset-4 hover:text-orange"
                            >
                              Model uploaden
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                    {open ? (
                      <div className="mt-2">
                        <ItemCheckInButton orderId={order.id} itemId={item.id} stage={itemStage(item)} />
                      </div>
                    ) : null}
                    {item.checkedInAt && (
                      <p className="text-xs text-text-muted">
                        Afgevinkt door {item.checkedInBy} op {formatDateTime(item.checkedInAt)}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold tabular-nums">{euro(item.unitCents * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1 border-t border-off-white-dark pt-4 text-sm">
              <div className="flex justify-between">
                <dt>Subtotaal</dt>
                <dd className="tabular-nums">{euro(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt>Korting{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
                  <dd className="tabular-nums">- {euro(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Verzending{order.shipment ? ` (${order.shipment.label})` : ""}</dt>
                <dd className="tabular-nums">{euro(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Totaal</dt>
                <dd className="tabular-nums">{euro(order.totalCents)}</dd>
              </div>
              {/* Only on orders from before the VAT exemption. */}
              {order.vatCents > 0 && (
                <div className="flex justify-between text-text-muted">
                  <dt>waarvan btw</dt>
                  <dd className="tabular-nums">{euro(order.vatCents)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="order-1 rounded-3xl bg-white p-5 sm:p-6 lg:order-none">
            <h2 className="font-display text-xl font-medium text-medium-green">Betalingen</h2>
            {order.payments.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">Geen betaling aangemaakt.</p>
            ) : (
              <ul className="mt-3 divide-y divide-off-white-dark text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <PaymentStatusBadge status={payment.status} />
                    {payment.provider !== MANUAL_PAYMENT_PROVIDER && <span className="font-mono text-xs">{payment.providerPaymentId}</span>}
                    <span>{payment.method ? (PAYMENT_METHOD_LABELS[payment.method] ?? payment.method) : "methode nog niet gekozen"}</span>
                    {payment.provider === MANUAL_PAYMENT_PROVIDER && <span className="text-xs text-text-muted">door een admin geregistreerd</span>}
                    {payment.mode === "test" && <span className="text-xs font-bold text-banner-text">TESTMODUS</span>}
                    <span className="tabular-nums">{euro(payment.amountCents)}</span>
                    {payment.refundedCents > 0 && <span className="text-[#a3341a]">terugbetaald {euro(payment.refundedCents)}</span>}
                    {payment.chargedBackCents > 0 && (
                      <span className="text-[#a3341a]">chargeback {euro(payment.chargedBackCents)}</span>
                    )}
                    {payment.provider !== MANUAL_PAYMENT_PROVIDER && (
                      <span className="text-xs text-text-muted">
                        laatst gecontroleerd {payment.lastSyncedAt ? formatDateTime(payment.lastSyncedAt) : "—"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="order-1 rounded-3xl bg-white p-5 sm:p-6 lg:order-none">
            <h2 className="font-display text-xl font-medium text-medium-green">Geschiedenis</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {order.statusChanges.map((change, index) => (
                <li key={index} className="flex flex-wrap gap-x-3">
                  <span className="tabular-nums text-text-muted">{formatDateTime(change.createdAt)}</span>
                  <span className="font-semibold">
                    {change.fromStatus && change.fromStatus !== change.toStatus
                      ? `${orderStatusLabel(change.fromStatus)} → ${orderStatusLabel(change.toStatus)}`
                      : orderStatusLabel(change.toStatus)}
                  </span>
                  <span className="text-text-muted">{change.source}</span>
                  {change.note && <span className="w-full break-words text-text-muted">{change.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="contents lg:flex lg:flex-col lg:gap-6">
          {order.status === "PENDING_PAYMENT" && order.createdBy && (
            <OrderPaymentPanel
              orderId={order.id}
              checkoutUrl={openPaymentLink}
              paymentsAvailable={paymentProvider.isConfigured()}
              canSendConfirmation={Boolean(order.email)}
              free={order.totalCents === 0}
            />
          )}
          {(open || (order.status === "SHIPPED" && paidManually)) && (
            <OrderProgressPanel
              orderId={order.id}
              status={order.status}
              summary={summary}
              nextStep={nextStepLabel(order.status, summary, { handover })}
              handover={handover}
              canMarkRefunded={paidManually}
            />
          )}
          <OrderActions
            orderId={order.id}
            canSyncPayment={hasProviderPayment}
            canResendConfirmation={confirmable && Boolean(order.email)}
            attentionReason={order.attentionReason}
          />

          <section className="rounded-3xl bg-white p-6 text-sm">
            <h2 className="font-display text-xl font-medium text-medium-green">Klant</h2>
            <p className="mt-3 font-semibold">
              {order.firstName} {order.lastName}
            </p>
            {order.email && <p className="break-words">{order.email}</p>}
            {order.phone && <p>{order.phone}</p>}
            {order.address && (
              <>
                <h3 className="mt-4 font-label font-semibold text-text-muted">Leveradres</h3>
                <p>
                  {order.address.street} {order.address.houseNumber}
                  <br />
                  {order.address.postalCode} {order.address.city}
                  <br />
                  {order.address.country}
                </p>
              </>
            )}
            {order.shipment && (
              <>
                <h3 className="mt-4 font-label font-semibold text-text-muted">Levering</h3>
                <p>
                  {order.shipment.label} ({euro(order.shipment.priceCents)})
                </p>
                {order.shipment.trackingCode && <p className="font-mono text-xs">{order.shipment.trackingCode}</p>}
              </>
            )}
            <h3 className="mt-4 font-label font-semibold text-text-muted">Overige</h3>
            <p>
              {order.termsAcceptedAt
                ? `Voorwaarden ${order.termsVersion} aanvaard op ${formatDateTime(order.termsAcceptedAt)}`
                : "Voorwaarden niet online aanvaard (handmatig toegevoegd)"}
            </p>
            <p>Nieuwsbrief: {order.marketingOptIn ? "ja" : "nee"}</p>
            <p>
              Bevestigingsmail:{" "}
              {order.confirmationSentAt ? formatDateTime(order.confirmationSentAt) : confirmable ? "niet verstuurd" : "—"}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
