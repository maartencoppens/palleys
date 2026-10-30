import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/core/modules/auth/service";
import { GoogleSignInButton } from "@/components/functional/admin/GoogleSignInButton";

export const instant = false;

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-medium-green px-5">
      <div className="w-full max-w-md rounded-3xl bg-off-white p-6 md:rounded-[32px] md:p-10">
        <Image
          className="h-auto w-24 rounded-2xl bg-medium-green p-3"
          src="/images/footer/palleys-logo.svg"
          width={349}
          height={188}
          alt="Palleys"
          priority
        />
        <h1 className="mt-6 font-display text-[clamp(2rem,1.6rem+1.5vw,2.75rem)] leading-[1.1] font-medium text-medium-green">
          Palleys admin
        </h1>
        <p className="mt-2 text-base leading-[1.5] text-text-primary">
          Log in met het Google-account waarmee je toegang hebt gekregen.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-pink px-4 py-3 font-label text-sm font-semibold text-[#a3341a]"
          >
            Inloggen is mislukt, of dit account heeft geen toegang.
          </p>
        )}
        <GoogleSignInButton className="mt-6 w-full" />
      </div>
    </main>
  );
}
