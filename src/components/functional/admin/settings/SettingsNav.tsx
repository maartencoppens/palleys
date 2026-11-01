"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    label: "Verkoop",
    links: [
      { href: "/admin/settings", label: "Bestellen" },
      { href: "/admin/settings/products", label: "Gepersonaliseerde Palley" },
      { href: "/admin/settings/collectibles", label: "Collectibles" },
      { href: "/admin/settings/shipping", label: "Verzending" },
    ],
  },
  {
    label: "Website",
    links: [
      { href: "/admin/settings/content", label: "Teksten" },
      { href: "/admin/settings/company", label: "Bedrijf & sociale media" },
    ],
  },
  {
    label: "Systeem",
    links: [{ href: "/admin/settings/integrations", label: "Koppelingen" }],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Instellingen" className="flex flex-col gap-6 lg:sticky lg:top-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 font-label text-xs font-semibold tracking-wide text-text-muted uppercase">{group.label}</p>
          <ul className="mt-2 flex flex-wrap gap-1 lg:flex-col">
            {group.links.map((link) => {
              const active =
                link.href === "/admin/settings" ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-xl px-3 py-2 font-label text-base font-bold transition-colors ${
                      active ? "bg-medium-green text-off-white" : "text-medium-green hover:bg-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
