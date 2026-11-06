"use client";
import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { uploadCustomerPhotos } from "@/core/modules/previews/api";
import { postAddToCart } from "@/core/modules/cart/api";
import type { CartView } from "@/core/modules/cart/types";
import { useMessages } from "@/core/locale/client";
import type { Animal, Attachment, Edition } from "@/data/options";

type Photo = { id: string; file: File };
type Input = { animal: Animal; edition: Edition; attachment?: Attachment; photos: Photo[]; notes: string };
type Status = "idle" | "uploading" | "adding" | "done";

/**
 * Upload → preview → cart, as one action for the configurator.
 * The upload is remembered for the same set of photos, so retrying after a failed cart call
 * doesn't upload (and store) the photos a second time.
 */
export function useAddPalleyToCart() {
  const errors: Record<string, string> = useMessages().create.errors;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartView | null>(null);
  const upload = useRef<{ photoIds: string; previewId: string } | null>(null);

  const addToCart = useCallback(async ({ animal, edition, attachment, photos, notes }: Input) => {
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
        attachment,
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
      const code = axios.isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError((code && errors[code]) || errors.fallback);
      setStatus("idle");
    }
  }, [errors]);

  const reset = useCallback(() => {
    upload.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  return { addToCart, reset, status, error, cart, busy: status === "uploading" || status === "adding" };
}
