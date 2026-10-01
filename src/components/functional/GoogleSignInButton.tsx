"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/core/modules/auth/api";
import { Button } from "@/components/design/Button";

type GoogleSignInButtonProps = {
  className?: string;
};

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className={className}
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
