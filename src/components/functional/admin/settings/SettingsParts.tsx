import type { ReactNode } from "react";
import Button from "@/components/design/Button";

export const fieldLabelClassName = "font-label text-sm font-semibold text-text-muted";
export const compactFieldClassName = "h-11 text-base md:text-base";

/** Page heading of one settings section. */
export function SettingsHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-medium text-medium-green">{title}</h2>
        {intro && <p className="mt-1 text-base text-text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function SettingsCard({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 md:p-8">
      <h3 className="font-display text-2xl font-medium text-medium-green">{title}</h3>
      {intro && <p className="mt-1 text-sm text-text-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

type SaveBarProps = {
  saving: boolean;
  message: string | null;
  error: string | null;
  label?: string;
  disabled?: boolean;
};

export function SaveBar({ saving, message, error, label = "Opslaan", disabled }: SaveBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" variant="primary" loading={saving} loadingText="Opslaan…" disabled={disabled}>
        {label}
      </Button>
      {message && (
        <p role="status" className="text-sm text-medium-green">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
