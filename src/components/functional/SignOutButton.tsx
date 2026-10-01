"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/core/modules/auth/api";
import Button from "../design/Button";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await signOut(); // verwijdert sessie in DB + cookie
        router.push("/admin/login");
      }}
    >
      Uitloggen
    </Button>
  );
}
