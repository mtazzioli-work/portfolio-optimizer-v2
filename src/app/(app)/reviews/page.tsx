import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { requestReviewAction } from "@/app/(app)/reviews/actions";
import { canRequestReview } from "@/lib/access";
import { getQuotaUsage } from "@/lib/quota";
import { userHasSavedInvestmentProfile } from "@/lib/investment-profile";
import { formatNumber, formatUsd } from "@/lib/review-amounts";
import {
  getCurrentSnapshotReviewState,
  listReviewsForUser,
} from "@/lib/reviews";
import { getOrCreateUser } from "@/lib/users";

const STATUS_LABELS: Record<string, string> = {
  done: "Completada",
  error: "Error",
  processing: "En progreso",
  pending: "Pendiente",
};

export default async function ReviewsPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  const reviews = await listReviewsForUser(user.clerkUserId);
  const snapshotState = await getCurrentSnapshotReviewState(user.clerkUserId);
  const quota = canRequestReview(user.accessStatus)
    ? await getQuotaUsage(user)
    : null;
  const hasInvestmentProfile = await userHasSavedInvestmentProfile(
    user.clerkUserId,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Revisión con IA sobre tus snapshots. Cada review exitosa consume 1
          unidad de tu cuota mensual.
        </p>
      </div>

      {quota && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Cuota este mes</p>
          <p className="mt-1 text-lg font-medium">
            {quota.used} / {quota.limit} reviews usadas · {quota.remaining}{" "}
            restantes
          </p>
          {quota.totalTokens > 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              {formatNumber(quota.totalTokens)} tokens · ~
              {formatUsd(quota.totalCostUsd, { decimals: 2 })} este mes
            </p>
          )}
        </section>
      )}

      {snapshotState?.currentSnapshotId && canRequestReview(user.accessStatus) && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          {snapshotState.doneReview ? (
            <div className="space-y-3">
              <p className="font-medium">Snapshot actual ya revisado</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Completada el{" "}
                {format(
                  new Date(snapshotState.doneReview.createdAt),
                  "d MMM yyyy HH:mm",
                  { locale: es },
                )}
                . Para una nueva review, subí un snapshot nuevo.
              </p>
              <Link
                href={`/reviews/${snapshotState.doneReview.id}`}
                className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Ver review
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="font-medium">Snapshot actual sin review</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Optimizá tu portafolio con IA sobre tu último snapshot.
                </p>
              </div>
              {quota && quota.remaining <= 0 && !snapshotState.failedReview ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Cuota mensual agotada.
                </p>
              ) : (
                <RequestReviewButton
                  snapshotId={snapshotState.currentSnapshotId}
                  requestReview={requestReviewAction}
                  hasInvestmentProfile={hasInvestmentProfile}
                  label={
                    snapshotState.failedReview
                      ? "Reintentar review"
                      : "Solicitar review"
                  }
                />
              )}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historial</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no tenés reviews. Subí un snapshot y solicitá tu primera
            review.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reviews/${r.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(r.createdAt), "d MMM yyyy HH:mm", {
                        locale: es,
                      })}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {r.totalValueUsd != null
                        ? `Valor snapshot: ${formatUsd(r.totalValueUsd)}`
                        : "Snapshot"}
                      {r.totalTokens != null && r.totalTokens > 0 && (
                        <>
                          {" "}
                          · {formatNumber(r.totalTokens)} tokens
                          {r.estimatedCostUsd != null && (
                            <> · ~{formatUsd(r.estimatedCostUsd, { decimals: 2 })}</>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
