"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postApprovePreview } from "@/core/modules/previews/api";
import { getApiErrorMessage } from "@/core/networking/api";
import { Button } from "@/components/design/Button";

type ApprovePreviewButtonProps = {
  previewId: string;
};

export function ApprovePreviewButton({ previewId }: ApprovePreviewButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!window.confirm("Dit model goedkeuren voor print?")) return;
    setLoading(true);
    setError(null);
    try {
      await postApprovePreview(previewId);
      router.refresh(); // server-pagina opnieuw ophalen → nieuwe status zichtbaar
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <Button className="w-full" loading={loading} onClick={handleApprove}>
        Model goedkeuren
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
