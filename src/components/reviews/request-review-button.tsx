"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  snapshotId: string;
  requestReview: (snapshotId: string) => Promise<{
    reviewId?: string;
    error?: string;
    existingReviewId?: string;
  }>;
  hasUnsavedLiquidAssets?: boolean;
  label?: string;
  className?: string;
};

export function RequestReviewButton({
  snapshotId,
  requestReview,
  hasUnsavedLiquidAssets = false,
  label = "Solicitar review",
  className,
}: Props) {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleClick = async () => {
    if (hasUnsavedLiquidAssets) {
      toast.error(
        "Guardá tus activos líquidos antes de solicitar la review",
      );
      return;
    }

    setIsRequesting(true);
    try {
      toast.info("Ejecutando review… puede tardar 30–60 segundos");
      const result = await requestReview(snapshotId);
      if (result.error) {
        if (result.existingReviewId) {
          toast.error(result.error);
          router.push(`/reviews/${result.existingReviewId}`);
          return;
        }
        toast.error(result.error);
        return;
      }
      if (result.reviewId) {
        toast.success("Review completada");
        router.push(`/reviews/${result.reviewId}`);
        router.refresh();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRequesting}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      }
    >
      {isRequesting && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
      {isRequesting ? "Ejecutando review…" : label}
    </button>
  );
}
