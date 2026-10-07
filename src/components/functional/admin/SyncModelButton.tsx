"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postSyncModel } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

type SyncModelButtonProps = { previewId: string };

export function SyncModelButton({ previewId }: SyncModelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await postSyncModel(previewId);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="mt-4">
      <Button
        variant="secondary"
        className="w-full"
        loading={loading}
        loadingText="Status ophalen…"
        onClick={handleClick}
      >
        Status ophalen
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
