"use client";
import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { uploadCustomerPhotos } from "@/core/modules/previews/api";
import { postAddToCart } from "@/core/modules/shopify/api";
import type { CartView } from "@/core/modules/shopify/types";
import type { Animal, Edition } from "@/data/options";

type Photo = { id: string; file: File };
type Input = { animal: Animal; edition: Edition; photos: Photo[]; notes: string };
type Status = "idle" | "uploading" | "adding" | "done";

const ERROR_MESSAGES: Record<string, string> = {
  photos_missing: "Je foto’s zijn niet goed aangekomen. Probeer het nog eens.",
  preview_not_orderable: "Deze upload is verlopen. Voeg je foto’s opnieuw toe.",
  preview_not_found: "Deze upload is verlopen. Voeg je foto’s opnieuw toe.",
  variant_unavailable: "Deze Palley is even niet beschikbaar. Kies een andere uitvoering of probeer later opnieuw.",
};
const FALLBACK_ERROR = "Er ging iets mis bij het toevoegen. Probeer het nog eens.";

function messageFor(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    const code = error.response?.data?.error;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  }
  return FALLBACK_ERROR;
}

/**
 * Upload → preview → Shopify cart, as one action for the configurator.
 * The upload is remembered for the same set of photos, so retrying after a failed cart call
 * doesn't upload (and store) the photos a second time.
 */
export function useAddPalleyToCart() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartView | null>(null);
  const upload = useRef<{ photoIds: string; previewId: string } | null>(null);

  const addToCart = useCallback(async ({ animal, edition, photos, notes }: Input) => {
    setError(null);
    const photoIds = photos.map((p) => p.id).join(",");
    try {
      let previewId = upload.current?.photoIds === photoIds ? upload.current.previewId : null;
      if (!previewId) {
        setStatus("uploading");
        ({ previewId } = await uploadCustomerPhotos(photos.map((p) => p.file)));
        upload.current = { photoIds, previewId };
      }
      setStatus("adding");
      const updated = await postAddToCart({
        previewId,
        animal,
        edition,
        notes: notes.trim() || undefined,
      });
      setCart(updated);
      setStatus("done");
    } catch (err) {
      // An expired or unknown preview needs a fresh upload next time.
      if (axios.isAxiosError<{ error?: string }>(err)) {
        const code = err.response?.data?.error;
        if (code === "preview_not_orderable" || code === "preview_not_found" || code === "photos_missing") {
          upload.current = null;
        }
      }
      setError(messageFor(err));
      setStatus("idle");
    }
  }, []);

  const reset = useCallback(() => {
    upload.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  return { addToCart, reset, status, error, cart, busy: status === "uploading" || status === "adding" };
}
