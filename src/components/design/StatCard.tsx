import Link from "next/link";

type StatCardProps = {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "danger";
};

export function StatCard({
  label,
  value,
  href,
  tone = "default",
}: StatCardProps) {
  const highlight = tone === "danger" && value > 0;
  return (
    <Link
      href={href}
      className="rounded-3xl bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgb(7_88_71/0.45)]"
    >
      <p className="font-label text-sm font-semibold text-text-muted">{label}</p>
      <p
        className={`mt-2 font-display text-4xl font-medium tabular-nums ${highlight ? "text-[#a3341a]" : "text-medium-green"}`}
      >
        {value}
      </p>
    </Link>
  );
}
