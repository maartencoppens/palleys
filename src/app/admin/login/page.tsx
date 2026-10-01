import { redirect } from "next/navigation";
import { getAdminSession } from "@/core/modules/auth/service";
import { GoogleSignInButton } from "@/components/functional/GoogleSignInButton";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main>
      <h1>Palleys admin</h1>
      {error && <p>Inloggen mislukt of dit account heeft geen toegang.</p>}
      <p>
        Log in met je Google-account om toegang te krijgen tot de admin panel.
      </p>
      <GoogleSignInButton />
    </main>
  );
}
