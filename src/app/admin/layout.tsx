import type { Metadata } from "next";
import { fontClassName, siteIcons } from "../fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Palleys admin", icons: siteIcons, robots: { index: false, follow: false } };

// The backoffice's root layout, for ALL admin pages including /admin/login: Dutch, same font and background as the shop.
// The login check is one level deeper, in (protected)/layout.tsx.
export default function AdminShellLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="nl" className={fontClassName} suppressHydrationWarning>
      <body>
        <div className="min-h-screen bg-page font-body text-text-primary">{children}</div>
      </body>
    </html>
  );
}
