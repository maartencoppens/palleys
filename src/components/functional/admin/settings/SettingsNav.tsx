"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const GROUPS = [
  {
    label: "Verkoop",
    links: [
      { href: "/admin/settings", label: "Bestellen" },
      { href: "/admin/settings/products", label: "Gepersonaliseerde Palley" },
      { href: "/admin/settings/collectibles", label: "Collectibles" },
      { href: "/admin/settings/discounts", label: "Kortingscodes" },
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
    links: [
      { href: "/admin/settings/prompts", label: "AI-prompt" },
      { href: "/admin/settings/integrations", label: "Koppelingen" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin/settings" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/* A list beside the settings from lg up; on a phone a dropdown, so the section you're in stays near the top of the page. */
export function SettingsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const current = GROUPS.flatMap((group) => group.links).find((link) => isActive(pathname, link.href));
  return (
    <>
      <select
        aria-label="Sectie kiezen"
        value={current?.href}
        onChange={(event) => router.push(event.target.value)}
        className="h-12 w-full rounded-2xl border-[1.5px] border-off-white-dark bg-white px-4 font-label text-base font-bold text-medium-green lg:hidden"
      >
        {GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.links.map((link) => (
              <option key={link.href} value={link.href}>
                {link.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <nav aria-label="Instellingen" className="hidden flex-col gap-6 lg:sticky lg:top-6 lg:flex">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 font-label text-xs font-semibold tracking-wide text-text-muted uppercase">{group.label}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {group.links.map((link) => {
                const active = isActive(pathname, link.href);
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
    </>
  );
}
