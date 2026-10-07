import Link from "next/link";
import { requireAdminPage } from "@/core/modules/auth/service";
import { SignOutButton } from "@/components/functional/admin/SignOutButton";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdminPage();
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <Link
            href="/admin"
            className="text-lg font-semibold font-stretch-semi-condensed"
          >
            Palleys admin
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </>
  );
}
