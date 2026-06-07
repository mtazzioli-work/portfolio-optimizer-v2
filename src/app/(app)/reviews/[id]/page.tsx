import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewView } from "@/components/reviews/review-view";
import { requestReviewAction } from "@/app/(app)/reviews/actions";
import { type AnalysisResult } from "@/lib/claude-analysis";
import { canRequestReview } from "@/lib/access";
import { getReviewForUser } from "@/lib/reviews";
import { getOrCreateUser } from "@/lib/users";

const STATUS_LABELS: Record<string, string> = {
  done: "Completada",
  error: "Error",
  processing: "En progreso",
  pending: "Pendiente",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return null;

  const review = await getReviewForUser(id, user.clerkUserId);
  if (!review) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/reviews"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Volver a reviews
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Review</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {format(new Date(review.createdAt), "d MMM yyyy HH:mm", {
              locale: es,
            })}{" "}
            · {STATUS_LABELS[review.status] ?? review.status}
          </p>
        </div>
      </div>

      {review.status === "error" && (
        <section className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="font-medium text-red-800 dark:text-red-300">
            La review falló
          </p>
          {review.errorMessage && (
            <p className="text-sm text-red-700 dark:text-red-400">
              {review.errorMessage}
            </p>
          )}
          {canRequestReview(user.accessStatus) && (
            <RequestReviewButton
              snapshotId={review.snapshotId}
              requestReview={requestReviewAction}
              label="Reintentar review"
            />
          )}
        </section>
      )}

      {review.status === "processing" && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            La review está en progreso. Si cerraste la ventana durante la
            ejecución, refrescá esta página en unos segundos.
          </p>
        </section>
      )}

      {review.status === "done" && review.result != null ? (
        <ReviewView result={review.result as AnalysisResult} />
      ) : null}
    </div>
  );
}
