import Image from "next/image";
import { useLocale, useMessages } from "@/core/locale/client";
import { formatPrice } from "@/core/utils/format";

type OrderSummaryProps = {
  pet: string | null;
  edition: string | null;
  /** Null for a figurine: nothing to attach. */
  attachment: string | null;
  /** Longest side, e.g. "3.7 cm". */
  size: string;
  /** File name for one photo, "3 photos" for several. */
  photos: string | null;
  priceCents: number;
};

/* Figma: order-summary. The image is always an example, never a preview of the real model. */
export default function OrderSummary({
  pet,
  edition,
  attachment,
  size,
  photos,
  priceCents,
}: OrderSummaryProps) {
  const { summary: m } = useMessages().create;
  const locale = useLocale();
  const rows = [
    { label: m.pet, value: pet },
    { label: m.palley, value: edition },
    ...(attachment ? [{ label: m.attachment, value: attachment }] : []),
    { label: m.size, value: size },
    { label: m.photos, value: photos },
  ];

  return (
    <aside
      aria-labelledby="summary-title"
      className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8"
    >
      <h2
        id="summary-title"
        className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]"
      >
        {m.title}
      </h2>

      <dl className="flex flex-col gap-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-lg text-text-primary"
          >
            <dt>{row.label}</dt>
            <dd
              className={`min-w-0 truncate font-label font-semibold ${row.value ? "" : "text-placeholder"}`}
            >
              {row.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      <hr className="border-text-primary" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-medium-green">
          <p className="font-display text-2xl leading-[1.2] font-medium">
            {m.total}
          </p>
          <p className="font-label text-[32px] leading-[normal] font-extrabold">
            {formatPrice(priceCents / 100, locale)}
          </p>
        </div>
        <p className="text-sm leading-[1.5] text-text-primary">
          {m.exclShipping}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[20px] bg-light-yellow p-4">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-coral"
          aria-hidden
        >
          <Image
            src="/images/create/heart.svg"
            width={16.5}
            height={15}
            alt=""
          />
        </span>
        <p className="text-[15px] leading-[1.5] text-text-primary">
          {m.charity}
        </p>
      </div>
    </aside>
  );
}
