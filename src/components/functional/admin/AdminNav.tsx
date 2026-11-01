"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The backoffice has two jobs: getting each order out of the door, and running the website.
const GROUPS = [
  {
    label: "Orders",
    links: [
      { href: "/admin", label: "Check-in" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/review", label: "Te reviewen" },
      { href: "/admin/approved", label: "Goedgekeurd" },
      { href: "/admin/processed", label: "Processed" },
    ],
  },
  {
    label: "Website",
    links: [{ href: "/admin/settings", label: "Instellingen" }],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Backoffice" className="flex flex-wrap gap-x-8 gap-y-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <span className="font-label text-xs font-semibold tracking-wide text-off-white/60 uppercase">{group.label}</span>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 font-label text-base font-bold">
            {group.links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`transition-colors hover:text-accent-highlights ${active ? "text-accent-highlights" : ""}`}
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
