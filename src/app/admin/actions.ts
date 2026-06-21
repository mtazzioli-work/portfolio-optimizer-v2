"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appSettings, users, type AccessStatus } from "@/db/schema";
import { resetUserPassword as resetUserPasswordAction } from "@/app/auth/actions";
import { MONTHLY_REVIEW_LIMIT_DEFAULT_KEY } from "@/lib/settings";
import { getCurrentUser } from "@/lib/users";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("No autorizado");
  }
  return user;
}

export async function updateUserAccessStatus(
  userId: string,
  accessStatus: AccessStatus,
) {
  await requireAdmin();

  await db
    .update(users)
    .set({ accessStatus, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

export async function updateUserMonthlyReviewLimit(
  userId: string,
  limit: number | null,
) {
  await requireAdmin();

  await db
    .update(users)
    .set({
      monthlyReviewLimit: limit,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

export async function updateMonthlyReviewLimitDefault(formData: FormData) {
  await requireAdmin();

  const limit = Number(formData.get("limit"));
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error("Límite inválido");
  }

  const value = String(Math.floor(limit));

  await db
    .insert(appSettings)
    .values({
      key: MONTHLY_REVIEW_LIMIT_DEFAULT_KEY,
      value,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin");
}

export async function updateUserMonthlyReviewLimitFromForm(
  userId: string,
  formData: FormData,
) {
  await requireAdmin();

  const raw = formData.get("limit");
  const limit =
    raw === "" || raw === null || raw === undefined ? null : Number(raw);

  if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
    throw new Error("Límite inválido");
  }

  await db
    .update(users)
    .set({
      monthlyReviewLimit: limit === null ? null : Math.floor(limit),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

export async function resetUserPassword(userId: string) {
  await requireAdmin();
  await resetUserPasswordAction(userId);
  revalidatePath("/admin");
}
