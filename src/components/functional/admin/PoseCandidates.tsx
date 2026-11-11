"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postApprovePoseCandidate, uploadPose } from "@/core/modules/previews/api";
import type { AdminPoseCandidate } from "@/core/modules/previews/types";
import { getApiErrorMessage } from "@/core/networking/api";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/components/design/Badge";
import { Button } from "@/components/design/Button";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/data/uploads";
import { PoseComparison, type ComparedPose } from "./PoseComparison";

type PoseCandidatesProps = {
  previewId: string;
  photoUrls: string[];
  candidates: AdminPoseCandidate[];
  canApprove: boolean;
  canUpload: boolean;
  uploadsLeft: number;
};

/*
 * Every pose of this Palley side by side: the generated attempts and the admin's own uploads. The team compares them,
 * then approves exactly one, which Meshy turns into the 3D model. Older attempts are kept until the model is approved.
 */
export function PoseCandidates({ previewId, photoUrls, candidates, canApprove, canUpload, uploadsLeft }: PoseCandidatesProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve(pose: ComparedPose) {
    if (!window.confirm(`${pose.label} goedkeuren en het 3D-model laten maken? Dit kost Meshy-credits.`)) return;
    setApproving(pose.id);
    setError(null);
    try {
      await postApprovePoseCandidate(previewId, pose.id);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setApproving(null);
      router.refresh(); // ook bij een fout: de status kan FAILED geworden zijn
    }
  }

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) return setError("Deze afbeelding is groter dan 10 MB");
    setUploading(true);
    setError(null);
    try {
      await uploadPose(previewId, file);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }

  const poses: ComparedPose[] = candidates.map(({ id, url, label, current }) => ({ id, url, label, current }));

  return (
    <section aria-labelledby="poses-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="poses-title" className="font-display text-xl font-medium text-medium-green">
          Poses {candidates.length > 0 && <span className="text-text-muted">({candidates.length})</span>}
        </h2>
        {canApprove && candidates.length > 1 && <p className="text-sm text-text-muted">Kies de beste en keur die goed.</p>}
      </div>

      {candidates.length === 0 ? (
        <div className="flex aspect-square w-full max-w-60 items-center justify-center rounded-3xl border-2 border-dashed border-medium-green/25 text-sm text-text-muted">
          Nog geen pose
        </div>
      ) : (
        /* Bewust <img> en geen next/image: afgeleid van klantfoto's, niet via de image optimizer (GDPR). */
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-4">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <article
                aria-label={candidate.label}
                className={`flex h-full flex-col overflow-hidden rounded-3xl bg-white transition-shadow ${
                  candidate.current ? "shadow-[0_0_0_3px_var(--color-medium-green)]" : "shadow-[0_0_0_1px_rgb(7_88_71/0.12)]"
                }`}
              >
                <a
                  href={candidate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block aspect-square bg-off-white-dark/60 focus-visible:outline-3 focus-visible:outline-accent-highlights"
                  title="Op ware grootte openen"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={candidate.url} alt={candidate.label} className="size-full object-contain p-3" />
                  <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {candidate.current && <Badge tone="neutral">Huidige</Badge>}
                    {candidate.approvedAt && <Badge tone="success">Goedgekeurd</Badge>}
                  </span>
                </a>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="font-label text-base font-bold text-text-primary">{candidate.label}</h3>
                    <p className="mt-0.5 text-xs leading-[1.5] text-text-muted">
                      {candidate.source === "UPLOADED" ? `Geüpload door ${candidate.createdBy ?? "een admin"}` : "Gegenereerd"}
                      <br />
                      <span className="tabular-nums">{formatDateTime(candidate.createdAt)}</span>
                      {candidate.approvedAt && (
                        <>
                          <br />
                          Goedgekeurd door {candidate.approvedBy ?? "een admin"}
                        </>
                      )}
                    </p>
                  </div>
                  {canApprove && (
                    <Button
                      variant={candidate.current ? "primary" : "secondary"}
                      className="mt-auto w-full"
                      loading={approving === candidate.id}
                      loadingText="Taak starten…"
                      disabled={approving !== null}
                      onClick={() => approve(candidate)}
                    >
                      Deze goedkeuren
                    </Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {candidates.length > 0 && photoUrls.length > 0 && (
          <PoseComparison photoUrls={photoUrls} poses={poses} onApprove={canApprove ? approve : undefined} approving={approving} />
        )}
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="sr-only"
              id="pose-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button variant="secondary" loading={uploading} loadingText="Uploaden…" onClick={() => fileRef.current?.click()}>
              Eigen pose uploaden
            </Button>
            <span className="text-sm text-text-muted">
              Telt niet mee voor de pogingen · nog {uploadsLeft} {uploadsLeft === 1 ? "upload" : "uploads"}
            </span>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-[#a3341a]">
          {error}
        </p>
      )}
    </section>
  );
}
