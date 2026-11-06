import "server-only";
import { prisma } from "@/db/client";
import { Prisma, type DiscountCode } from "@/db/generated/client";
import type { OrderStatus } from "@/db/generated/enums";
import { PAID_ORDER_STATUSES } from "@/core/modules/orders/status";
import { DISCOUNT_CODE_MAX_LENGTH } from "@/data/discounts";
import type { AdminDiscount, DiscountInput } from "./types";
import { discountInputSchema } from "./types";
import { discountAmountCents, discountLabel, discountRejection, discountState } from "./utils";

/*
 * Discount codes. Usage is never counted up or down: it's the orders carrying the code, minus cancelled and expired
 * ones. So an abandoned checkout gives its use back by itself once the order closes, and nothing can drift out of step.
 * An unpaid order holds its use until then, otherwise a last available code could be spent twice.
 */

const RELEASED_STATUSES: OrderStatus[] = ["CANCELLED", "EXPIRED"];

export class DiscountNotFoundError extends Error {}
export class DiscountConflictError extends Error {}

type Db = Pick<typeof prisma, "order">;

export type DiscountCheck =
  | { ok: true; id: string; code: string; label: string; discountCents: number; personalDelivery: boolean }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "min_subtotal"; minSubtotalCents: number };

const INVALID: DiscountCheck = { ok: false, reason: "invalid" };

async function evaluate(db: Db, discount: DiscountCode, subtotalCents: number, email: string | null): Promise<DiscountCheck> {
  const used = { discountCodeId: discount.id, status: { notIn: RELEASED_STATUSES } };
  const [redemptions, emailRedemptions] = await Promise.all([
    db.order.count({ where: used }),
    discount.oncePerEmail && email ? db.order.count({ where: { ...used, email } }) : 0,
  ]);
  const rejection = discountRejection(discount, { redemptions, emailRedemptions }, subtotalCents);
  if (rejection === "invalid") return INVALID;
  if (rejection === "min_subtotal") return { ok: false, reason: rejection, minSubtotalCents: discount.minSubtotalCents };
  return {
    ok: true,
    id: discount.id,
    code: discount.code,
    label: discountLabel(discount),
    discountCents: discountAmountCents(discount, subtotalCents),
    personalDelivery: discount.personalDelivery,
  };
}

/** For showing a code in the checkout. Promises nothing: placing the order checks it again. */
export async function checkDiscount(code: string, subtotalCents: number): Promise<DiscountCheck> {
  if (code.length > DISCOUNT_CODE_MAX_LENGTH) return INVALID;
  const discount = await prisma.discountCode.findUnique({ where: { code } });
  return discount ? evaluate(prisma, discount, subtotalCents, null) : INVALID;
}

/**
 * The check that counts, inside the order's transaction. The row lock makes concurrent checkouts wait, so the last use of
 * a code can't go to two orders at once: the second one sees the first one's order in its count.
 */
export async function claimDiscount(
  tx: Prisma.TransactionClient,
  code: string,
  subtotalCents: number,
  email: string,
): Promise<DiscountCheck> {
  if (code.length > DISCOUNT_CODE_MAX_LENGTH) return INVALID;
  const [locked] = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "DiscountCode" WHERE "code" = ${code} FOR UPDATE`;
  if (!locked) return INVALID;
  const discount = await tx.discountCode.findUniqueOrThrow({ where: { id: locked.id } });
  return evaluate(tx, discount, subtotalCents, email);
}

// ---------- Admin ----------

function toAdmin(row: DiscountCode, redemptions: number, paidDiscountCents: number): AdminDiscount {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    label: discountLabel(row),
    minSubtotalCents: row.minSubtotalCents,
    maxRedemptions: row.maxRedemptions,
    oncePerEmail: row.oncePerEmail,
    personalDelivery: row.personalDelivery,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    active: row.active,
    note: row.note,
    state: discountState(row, redemptions),
    redemptions,
    paidDiscountCents,
  };
}

export async function listDiscountsForAdmin(): Promise<AdminDiscount[]> {
  const [rows, used, paid] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.groupBy({
      by: ["discountCodeId"],
      where: { discountCodeId: { not: null }, status: { notIn: RELEASED_STATUSES } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["discountCodeId"],
      where: { discountCodeId: { not: null }, status: { in: PAID_ORDER_STATUSES } },
      _sum: { discountCents: true },
    }),
  ]);
  const usedBy = new Map(used.map((row) => [row.discountCodeId, row._count._all]));
  const paidBy = new Map(paid.map((row) => [row.discountCodeId, row._sum.discountCents ?? 0]));
  return rows.map((row) => toAdmin(row, usedBy.get(row.id) ?? 0, paidBy.get(row.id) ?? 0));
}

export async function getDiscountForAdmin(id: string) {
  return (await listDiscountsForAdmin()).find((discount) => discount.id === id) ?? null;
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function createDiscount(raw: DiscountInput, adminName: string) {
  const input = discountInputSchema.parse(raw);
  try {
    return await prisma.discountCode.create({ data: { ...input, updatedBy: adminName }, select: { id: true } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DiscountConflictError(input.code);
    throw error;
  }
}

export async function updateDiscount(id: string, raw: DiscountInput, adminName: string) {
  const input = discountInputSchema.parse(raw);
  try {
    const { count } = await prisma.discountCode.updateMany({ where: { id }, data: { ...input, updatedBy: adminName } });
    if (count === 0) throw new DiscountNotFoundError(id);
    return { id };
  } catch (error) {
    if (isUniqueViolation(error)) throw new DiscountConflictError(input.code);
    throw error;
  }
}

export class DiscountInUseError extends Error {}

/** A code that was used stays for the books: turn it off instead. */
export async function deleteDiscount(id: string) {
  if ((await prisma.order.count({ where: { discountCodeId: id } })) > 0) throw new DiscountInUseError(id);
  const { count } = await prisma.discountCode.deleteMany({ where: { id } });
  if (count === 0) throw new DiscountNotFoundError(id);
  return { id };
}
