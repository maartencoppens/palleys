"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/core/modules/auth/api";
import Button from "@/components/design/Button";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await signInWithGoogle(); // browser wordt doorgestuurd naar Google
      }}
    >
      Inloggen met Google
    </Button>
  );
}
