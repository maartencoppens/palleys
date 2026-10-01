import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient(); // zelfde origin, dus geen baseURL nodig

export function signInWithGoogle() {
  return authClient.signIn.social({
    provider: "google",
    callbackURL: "/admin",
    errorCallbackURL: "/admin/login?error=1",
  });
}

export function signOut() {
  return authClient.signOut();
}
