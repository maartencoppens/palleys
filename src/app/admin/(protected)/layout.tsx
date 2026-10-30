import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { SignOutButton } from "@/components/functional/admin/SignOutButton";

export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdminPage();
  return (
    <>
      <header className="bg-medium-green text-off-white">
        <div className="page-container flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-full font-display text-xl font-medium"
          >
            <Image
              className="h-auto w-20"
              src="/images/footer/palleys-logo.svg"
              width={349}
              height={188}
              alt="Palleys"
              priority
            />
            Admin
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 font-label text-base font-bold">
            <Link href="/admin" className="transition-colors hover:text-accent-highlights">
              Dashboard
            </Link>
            <Link href="/admin/review" className="transition-colors hover:text-accent-highlights">
              Te reviewen
            </Link>
            <Link href="/admin/approved" className="transition-colors hover:text-accent-highlights">
              Goedgekeurd
            </Link>
            <Link href="/admin/processed" className="transition-colors hover:text-accent-highlights">
              Processed
            </Link>
          </nav>
          <div className="flex min-w-0 items-center gap-4 sm:ml-auto">
            <span className="truncate text-sm">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="page-container py-10 md:py-14">{children}</div>
    </>
  );
}
