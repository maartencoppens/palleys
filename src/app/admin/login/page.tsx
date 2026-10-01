import { redirect } from "next/navigation";
import { getAdminSession } from "@/core/modules/auth/service";
import { GoogleSignInButton } from "@/components/functional/GoogleSignInButton";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
        <h1 className="text-3xl font-semibold tracking-tight font-stretch-semi-condensed">
          Palleys admin
        </h1>
        <p className="mt-2 text-sm text-muted">
          Log in met het Google-account waarmee je toegang hebt gekregen.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            Inloggen is mislukt, of dit account heeft geen toegang.
          </p>
        )}
        <GoogleSignInButton className="mt-6 w-full" />
      </div>
    </main>
  );
}
