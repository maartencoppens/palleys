"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

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
      { href: "/admin/batches", label: "Batches" },
      { href: "/admin/production", label: "Productie" },
      { href: "/admin/returns", label: "Retour" },
    ],
  },
  {
    label: "Website",
    links: [
      { href: "/admin/settings", label: "Instellingen" },
      { href: "/admin/mailing", label: "Mailinglijst" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/* In a row from lg up; below that the links and the account sit behind a menu button, so a phone starts with the page. */
export function AdminNav({ account }: { account: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen((current) => !current)}
        className="ml-auto rounded-full border-[1.5px] border-off-white/60 px-5 py-2 font-label text-base font-bold lg:hidden"
      >
        {open ? "Sluiten" : "Menu"}
      </button>
      <div id="admin-menu" className={`${open ? "flex" : "hidden"} w-full flex-col gap-5 pb-2 lg:contents`}>
        <nav aria-label="Backoffice" className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:gap-x-8 lg:gap-y-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className="font-label text-xs font-semibold tracking-wide text-off-white/60 uppercase">{group.label}</span>
              <ul className="flex flex-col font-label text-lg font-bold lg:flex-row lg:flex-wrap lg:gap-x-5 lg:gap-y-1 lg:text-base">
                {group.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={`block py-2 transition-colors hover:text-accent-highlights lg:py-0 ${active ? "text-accent-highlights" : ""}`}
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
        {account}
      </div>
    </>
  );
}
