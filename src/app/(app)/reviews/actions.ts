"use server";

import { revalidatePath } from "next/cache";
import { canRequestReview } from "@/lib/access";
import { markReviewsListSeen } from "@/lib/onboarding-cookie";
import { requestReview } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/users";

export async function markReviewsListSeenAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await markReviewsListSeen();
  revalidatePath("/");
}

export async function requestReviewAction(
  snapshotId: string,
): Promise<{
  reviewId?: string;
  error?: string;
  existingReviewId?: string;
}> {
  const user = await getCurrentUser();
  if (!user || !canRequestReview(user.accessStatus)) {
    return { error: "No autorizado" };
  }

  const result = await requestReview(user, snapshotId);

  if (result.reviewId) {
    revalidatePath("/");
    revalidatePath("/reviews");
    revalidatePath(`/reviews/${result.reviewId}`);
    revalidatePath("/portfolio/upload");
  }

  return result;
}
