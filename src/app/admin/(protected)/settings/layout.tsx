import { SettingsNav } from "@/components/functional/admin/settings/SettingsNav";

export default function SettingsLayout({ children }: LayoutProps<"/admin/settings">) {
  return (
    <main>
      <h1 className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green">
        Website-instellingen
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <aside>
          <SettingsNav />
        </aside>
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
