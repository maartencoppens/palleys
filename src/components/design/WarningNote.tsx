import type { ReactNode } from "react";

/* A warning that has to be read, like the 50°C one: stands out from the running text around it. */
export default function WarningNote({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-3 rounded-2xl bg-light-yellow p-4 text-sm leading-[1.5] font-semibold text-text-primary md:text-base">
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-orange font-label text-sm font-bold text-off-white">
        !
      </span>
      <span>{children}</span>
    </p>
  );
}
