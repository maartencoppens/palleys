"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/core/modules/auth/api";
import Button from "@/components/design/Button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await signOut(); // verwijdert sessie in DB + cookie
        router.push("/admin/login");
      }}
    >
      Uitloggen
    </Button>
  );
}
