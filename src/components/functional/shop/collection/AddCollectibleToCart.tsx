"use client";

import axios from "axios";
import { useState } from "react";
import Button from "@/components/design/Button";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import { useMessages } from "@/core/locale/client";
import { postAddCollectibleToCart } from "@/core/modules/cart/api";

/* Straight into the cart: a collectible has nothing to configure. The navbar's mini cart opens to show it landed. */
export default function AddCollectibleToCart({ collectibleId }: { collectibleId: string }) {
  const { shop: m } = useMessages();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      publishCart(await postAddCollectibleToCart({ collectibleId }), { reveal: true });
    } catch (e) {
      const code = axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error : undefined;
      setError((code && code in m.errors && m.errors[code as keyof typeof m.errors]) || m.errors.fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="primary" className="w-full py-[18px] text-lg sm:w-auto sm:px-10" loading={busy} loadingText={m.adding} onClick={add}>
        {m.add}
      </Button>
      {error && (
        <p role="alert" className="font-label text-base font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
