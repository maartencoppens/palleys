import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "waiting" | "danger" | "success";

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-off-white-dark text-text-primary",
  waiting: "bg-light-yellow text-banner-text",
  danger: "bg-pink text-[#a3341a]",
  success: "bg-light-green text-medium-green",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 font-label text-xs font-bold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
