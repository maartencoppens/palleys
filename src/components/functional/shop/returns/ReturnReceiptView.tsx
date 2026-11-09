"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Button from "@/components/design/Button";
import { useLocale, useMessages } from "@/core/locale/client";
import { fill } from "@/core/locale/fill";
import { formatDay, formatMoment } from "@/core/utils/format";
import type { ReturnReceipt } from "@/core/modules/returns/types";
import { cardClassName } from "./styles";

/* The acknowledgement of receipt on screen: what was sent and when. The same goes out by mail. */
export default function ReturnReceiptView({ receipt, onBack }: { receipt: ReturnReceipt; onBack: () => void }) {
  const { returns: m } = useMessages();
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section role="status" aria-labelledby="return-done-title" className={cardClassName}>
      <span className="grid size-14 place-items-center rounded-full bg-medium-green" aria-hidden>
        <Image src="/images/create/check.svg" width={24} height={18} alt="" />
      </span>
      <h2 id="return-done-title" ref={headingRef} tabIndex={-1} className="mt-0! outline-none">
        {fill(m.done.title, { type: m.types[receipt.type] })}
      </h2>
      <p>{fill(m.done.text, { type: m.typesLower[receipt.type], date: formatMoment(receipt.submittedAt, locale) })}</p>
      <div>
        <p className="font-label font-bold">{m.summary.items}</p>
        {receipt.items.map((item) => (
          <p key={item.title}>
            {item.quantity} × {item.title}
          </p>
        ))}
      </div>
      {receipt.returnBy && <p className="font-semibold">{fill(m.done.returnBy, { date: formatDay(receipt.returnBy, locale) })}</p>}
      <Button variant="secondary" onClick={onBack} className="self-start">
        {m.done.back}
      </Button>
    </section>
  );
}
