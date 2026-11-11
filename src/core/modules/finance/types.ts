import { z } from "zod";
import type { OrderStatus, PaymentAdjustmentKind, PaymentStatus } from "@/db/generated/enums";
import { ORDER_STATUSES } from "@/core/modules/orders/types";

// No server-only imports: the finance page's client components and the unit tests use these too.

const calendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum als JJJJ-MM-DD").refine((day) => !Number.isNaN(Date.parse(`${day}T00:00:00Z`)));

export const PAYMENT_MODES = ["live", "test"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** The longest period one request may cover: keeps the queries (and the paste into Excel) reasonable. */
export const MAX_RANGE_DAYS = 3 * 366;

const range = {
  /** First and last calendar day in Belgium, both included. Empty = this month so far. */
  from: calendarDay.optional(),
  to: calendarDay.optional(),
  /** Stripe's test payments apart from the real ones. Payments an admin recorded by hand count as live. */
  mode: z.enum(PAYMENT_MODES).default("live"),
};

export const financeQuerySchema = z.object({
  ...range,
  /** A method key from methodKey(): bancontact, ideal, wero, cash, transfer, gift, ... */
  method: z.string().trim().max(40).regex(/^[a-z_]*$/).optional().transform((value) => value || undefined),
  status: z.union([z.literal(""), z.enum(ORDER_STATUSES)]).optional().transform((value) => value || undefined),
});

export const JOURNAL_TABLES = ["receipts", "customers", "ledger"] as const;
export type JournalTable = (typeof JOURNAL_TABLES)[number];

export const journalQuerySchema = z.object({
  ...range,
  format: z.enum(["json", "tsv"]).default("json"),
  /** Which table as TSV (one paste per table); JSON returns all three. */
  table: z.enum(JOURNAL_TABLES).optional(),
});

export type FinanceQuery = z.infer<typeof financeQuerySchema>;
export type JournalQuery = z.infer<typeof journalQuerySchema>;

export type FinancePayment = {
  provider: string; // stripe | manual (oude rijen: bancontact)
  providerPaymentId: string;
  mode: string | null;
  method: string | null;
  status: PaymentStatus;
  amountCents: number;
  refundedCents: number;
  chargedBackCents: number;
  /** From the Checkout Session snapshot: what Stripe's dashboard and payouts show. */
  paymentIntentId: string | null;
  createdAt: Date;
};

/** What the finance views need of an order: plain data, read by the service. */
export type FinanceOrder = {
  id: string;
  number: string;
  invoiceNumber: string | null;
  status: OrderStatus;
  createdBy: string | null;
  stockOrder: boolean;
  attentionReason: string | null;
  createdAt: Date;
  paidAt: Date | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  discountCode: string | null;
  totalCents: number;
  deliveryType: string | null;
  items: { kind: "personalized" | "collectible"; quantity: number; unitCents: number }[];
  payments: FinancePayment[];
};

/** A refund or chargeback (or one undone) on the day we saw it. */
export type FinanceAdjustment = {
  id: string;
  kind: PaymentAdjustmentKind;
  amountCents: number;
  occurredAt: Date;
  order: Pick<FinanceOrder, "id" | "number" | "invoiceNumber" | "stockOrder" | "firstName" | "lastName">;
  payment: Pick<FinancePayment, "provider" | "providerPaymentId" | "mode" | "method" | "paymentIntentId">;
};

/** One table of the sales journal: a header and rows of text cells, as they go into Excel. */
export type JournalTableData = { header: string[]; rows: string[][] };

export type SalesJournal = {
  from: string;
  to: string;
  mode: PaymentMode;
  receipts: JournalTableData;
  customers: JournalTableData;
  ledger: JournalTableData;
};

export type Granularity = "day" | "week" | "month";

export type FinanceBreakdownRow = { key: string; label: string; count: number; cents: number; share: number };

export type FinanceOrderRow = {
  id: string;
  number: string;
  invoiceNumber: string | null;
  status: OrderStatus;
  name: string;
  paidAt: string | null;
  method: string;
  manual: boolean;
  totalCents: number;
  receivedCents: number;
  refundedCents: number;
  chargedBackCents: number;
};

export type FinanceSummary = {
  grossCents: number; // echt ontvangen geld
  refundedCents: number;
  chargebackCents: number;
  netCents: number;
  paidOrders: number;
  moneyOrders: number; // met geld (de rest: geschenk, gratis met kortingscode)
  freeOrders: number;
  averageOrderCents: number;
  productCents: number; // na korting, zonder verzending
  shippingCents: number;
  discountCents: number;
  discountOrders: number;
  byMethod: FinanceBreakdownRow[];
  byChannel: FinanceBreakdownRow[];
  byProduct: FinanceBreakdownRow[];
  granularity: Granularity;
  series: { start: string; label: string; cents: number; count: number }[];
};

export type FinanceOverview = {
  query: { from: string; to: string; mode: PaymentMode; method?: string; status?: OrderStatus };
  summary: FinanceSummary;
  open: { pendingOrders: number; pendingCents: number; attentionOrders: number };
  methods: { key: string; label: string }[]; // de methodes die in deze periode voorkwamen, voor de filter
  orders: FinanceOrderRow[];
  ordersTruncated: boolean;
};
