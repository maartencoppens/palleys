import type { PalleyComment, PalleyCommentSource } from "@/core/modules/batches/comments";
import { formatDateTime } from "@/core/utils/format";

// Who said it, at a glance: the customer in yellow, the team in green, the model's status notes in grey.
const SOURCE_CLASSES: Record<PalleyCommentSource, string> = {
  customer: "border-accent-highlights bg-light-yellow/60",
  team: "border-medium-green bg-light-green/40",
  model: "border-off-white-dark bg-off-white",
};

/*
 * A Palley's (or an order's) comments as a short thread, oldest first: who wrote what, so whoever packs it reads
 * everything from the customer's wish to the team's last remark in one place. Renders nothing without comments.
 */
export function PalleyComments({ comments, title }: { comments: PalleyComment[]; title?: string }) {
  if (comments.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {title && <p className="font-label text-xs font-bold text-text-muted uppercase">{title}</p>}
      <ul className="flex flex-col gap-1.5">
        {comments.map((comment, index) => (
          <li key={index} className={`rounded-xl border-l-4 px-3 py-2 text-sm ${SOURCE_CLASSES[comment.source]}`}>
            <p className="font-label text-xs font-bold text-text-muted">
              {comment.label}
              {comment.by && ` · ${comment.by}`}
              {comment.at && ` · ${formatDateTime(comment.at)}`}
            </p>
            <p className="break-words whitespace-pre-line">{comment.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
