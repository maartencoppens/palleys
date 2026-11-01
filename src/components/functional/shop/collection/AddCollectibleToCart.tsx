"use client";

import axios from "axios";
import { useState } from "react";
import Button from "@/components/design/Button";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import { postAddCollectibleToCart } from "@/core/modules/cart/api";

const ERROR_MESSAGES: Record<string, string> = {
  collectible_unavailable: "Dit product is net niet meer beschikbaar.",
  cart_full: "Je winkelmandje zit vol. Reken eerst af of verwijder iets.",
  rate_limited: "Even rustig aan: probeer het over een paar minuten opnieuw.",
};

/* Straight into the cart: a collectible has nothing to configure. The navbar's mini cart opens to show it landed. */
export default function AddCollectibleToCart({ collectibleId }: { collectibleId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      publishCart(await postAddCollectibleToCart({ collectibleId }), { reveal: true });
    } catch (e) {
      const code = axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error : undefined;
      setError((code && ERROR_MESSAGES[code]) || "Er ging iets mis bij het toevoegen. Probeer het nog eens.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="primary" className="w-full py-[18px] text-lg sm:w-auto sm:px-10" loading={busy} loadingText="Toevoegen…" onClick={add}>
        In winkelmandje
      </Button>
      {error && (
        <p role="alert" className="font-label text-base font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
