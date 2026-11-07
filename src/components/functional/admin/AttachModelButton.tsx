"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postAttachPreviewModel } from "@/core/modules/collectibles/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

/* Retry for when the print zip didn't make it onto its collectible by itself. */
export function AttachModelButton({ previewId }: { previewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attach() {
    setLoading(true);
    setError(null);
    try {
      const { id } = await postAttachPreviewModel(previewId);
      router.push(`/admin/settings/collectibles/${id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <Button variant="primary" className="w-full" loading={loading} loadingText="Bezig…" onClick={attach}>
        Model op de collectible zetten
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </div>
  );
}
