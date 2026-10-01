// De echte admin controle
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { isAllowedAdminEmail } from "./utils";

export class UnauthorizedError extends Error {}

// cache() zorgt dat dit maar één keer per request de DB raakt,
// ook als layout én page het allebei aanroepen.
export const getAdminSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Opnieuw checken: iemand kan uit ADMIN_EMAILS verwijderd zijn nadat de sessie werd aangemaakt.
  if (!isAllowedAdminEmail(session.user.email)) return null;
  return session;
});

// Voor pagina's: stuur door naar login.
export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

// Voor API-routes: gooi een fout die de route vertaalt naar 401.
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
