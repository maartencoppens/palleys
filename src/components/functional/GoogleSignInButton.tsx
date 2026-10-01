"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/core/modules/auth/api";
import Button from "../design/Button";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signInWithGoogle(); // browser wordt doorgestuurd naar Google
      }}
    >
      {loading ? "Bezig…" : "Inloggen met Google"}
    </Button>
  );
}
