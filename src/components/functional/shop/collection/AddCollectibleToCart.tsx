"use client";

import axios from "axios";
import { useState } from "react";
import Button from "@/components/design/Button";
import ChoiceChips from "@/components/design/ChoiceChips";
import { attachmentIcons } from "@/components/functional/create/AttachmentIcons";
import { publishCart } from "@/core/hooks/useCartSnapshot";
import { useMessages } from "@/core/locale/client";
import { postAddCollectibleToCart } from "@/core/modules/cart/api";
import { attachments, type Attachment, type Edition } from "@/data/options";

type AddCollectibleToCartProps = {
  collectibleId: string;
  /** The editions on sale (the backoffice can switch one off), keychain first. */
  editions: readonly Edition[];
};

/*
 * The same two choices as the configurator, then straight into the cart: keychain or figurine, and for a keychain a
 * clip or a key ring. The navbar's mini cart opens to show it landed.
 */
export default function AddCollectibleToCart({ collectibleId, editions }: AddCollectibleToCartProps) {
  const { shop: m, create, options } = useMessages();
  const [edition, setEdition] = useState<Edition>(editions[0]);
  const [attachment, setAttachment] = useState<Attachment>(attachments[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const cart = await postAddCollectibleToCart({
        collectibleId,
        edition,
        attachment: edition === "keychain" ? attachment : undefined,
      });
      publishCart(cart, { reveal: true });
    } catch (e) {
      const code = axios.isAxiosError<{ error?: string }>(e) ? e.response?.data?.error : undefined;
      setError((code && code in m.errors && m.errors[code as keyof typeof m.errors]) || m.errors.fallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {editions.length > 1 && (
        <ChoiceChips
          legend={create.choose.edition}
          name="edition"
          options={editions.map((value) => ({ value, label: options.editions[value] }))}
          value={edition}
          onChange={setEdition}
        />
      )}
      {edition === "keychain" && (
        <ChoiceChips
          legend={create.choose.attachment}
          name="attachment"
          options={attachments.map((option) => ({
            value: option.value,
            label: options.attachments[option.value],
            icon: attachmentIcons[option.value],
          }))}
          value={attachment}
          onChange={setAttachment}
          hint={create.choose.keychainHint}
        />
      )}
      <Button variant="primary" className="w-full py-[18px] text-lg sm:w-auto sm:self-start sm:px-10" loading={busy} loadingText={m.adding} onClick={add}>
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
