"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { profileChips, profileChipSections } from "@/db/schema";
import { getOrCreateUser } from "@/lib/users";

async function requireAdmin() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "admin") {
    throw new Error("No autorizado");
  }
  return user;
}

export async function createProfileChipSection(formData: FormData) {
  await requireAdmin();

  const title = formData.get("title");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Título requerido");
  }

  await db.insert(profileChipSections).values({
    title: title.trim(),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  revalidatePath("/admin/profile-chips");
}

export async function updateProfileChipSection(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");
  const title = formData.get("title");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (typeof id !== "string" || typeof title !== "string" || !title.trim()) {
    throw new Error("Datos inválidos");
  }

  await db
    .update(profileChipSections)
    .set({
      title: title.trim(),
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      updatedAt: new Date(),
    })
    .where(eq(profileChipSections.id, id));

  revalidatePath("/admin/profile-chips");
}

export async function deleteProfileChipSection(sectionId: string) {
  await requireAdmin();
  await db
    .delete(profileChipSections)
    .where(eq(profileChipSections.id, sectionId));
  revalidatePath("/admin/profile-chips");
}

export async function createProfileChip(formData: FormData) {
  await requireAdmin();

  const sectionId = formData.get("sectionId");
  const label = formData.get("label");
  const insertText = formData.get("insertText");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (
    typeof sectionId !== "string" ||
    typeof label !== "string" ||
    typeof insertText !== "string" ||
    !label.trim() ||
    !insertText.trim()
  ) {
    throw new Error("Datos inválidos");
  }

  await db.insert(profileChips).values({
    sectionId,
    label: label.trim(),
    insertText: insertText.trim(),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: true,
  });

  revalidatePath("/admin/profile-chips");
}

export async function updateProfileChip(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");
  const label = formData.get("label");
  const insertText = formData.get("insertText");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (
    typeof id !== "string" ||
    typeof label !== "string" ||
    typeof insertText !== "string" ||
    !label.trim() ||
    !insertText.trim()
  ) {
    throw new Error("Datos inválidos");
  }

  await db
    .update(profileChips)
    .set({
      label: label.trim(),
      insertText: insertText.trim(),
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(profileChips.id, id));

  revalidatePath("/admin/profile-chips");
}

export async function deleteProfileChip(chipId: string) {
  await requireAdmin();
  await db.delete(profileChips).where(eq(profileChips.id, chipId));
  revalidatePath("/admin/profile-chips");
}
