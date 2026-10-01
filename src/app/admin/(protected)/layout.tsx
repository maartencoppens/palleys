import { requireAdminPage } from "@/core/modules/auth/service";
import { SignOutButton } from "@/components/functional/SignOutButton";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdminPage();
  return (
    <div>
      <header>
        <span>{user.email}</span>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
