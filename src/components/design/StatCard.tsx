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
      className="rounded-lg border border-line bg-surface p-5 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-accent"
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${highlight ? "text-danger" : ""}`}
      >
        {value}
      </p>
    </Link>
  );
}
