import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PortfolioUploadWorkspace } from "@/components/portfolio/portfolio-upload-workspace";
import { requestReviewAction } from "@/app/(app)/reviews/actions";
import { parseCSV } from "@/lib/csv-parser";
import {
  canEditLiquidAssets,
  canUploadSnapshots,
} from "@/lib/access";
import { LIQUID_EDITOR_CATEGORY } from "@/lib/liquid-assets-template";
import {
  getLiquidAssetsEditorText,
  getLiquidAssetsForUser,
  upsertLiquidAssets,
} from "@/lib/liquid-assets";
import { saveSnapshot } from "@/lib/snapshots";
import { getOrCreateUser } from "@/lib/users";
import {
  assertPositionCount,
  validateCsvFile,
} from "@/lib/upload-validation";

async function uploadSnapshotCsv(
  formData: FormData,
): Promise<{ error?: string; count?: number; snapshotId?: string }> {
  "use server";

  const user = await getOrCreateUser();
  if (!user || !canUploadSnapshots(user.accessStatus)) {
    return { error: "No autorizado" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No se proporcionó un archivo" };
  }

  try {
    validateCsvFile(file);
    const text = await file.text();
    const rows = parseCSV(text);
    assertPositionCount(rows.length);
    const snapshotId = await saveSnapshot(user.clerkUserId, rows, "csv");

    revalidatePath("/portfolio/upload");
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/reviews");

    return { count: rows.length, snapshotId };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al subir el snapshot",
    };
  }
}

async function uploadSnapshotText(
  formData: FormData,
): Promise<{ error?: string; count?: number; snapshotId?: string }> {
  "use server";

  const user = await getOrCreateUser();
  if (!user || !canUploadSnapshots(user.accessStatus)) {
    return { error: "No autorizado" };
  }

  const csvText = formData.get("csvText");
  if (typeof csvText !== "string" || !csvText.trim()) {
    return { error: "El contenido del CSV no puede estar vacío" };
  }

  try {
    const rows = parseCSV(csvText);
    assertPositionCount(rows.length);
    const snapshotId = await saveSnapshot(user.clerkUserId, rows, "text");
    revalidatePath("/portfolio/upload");
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/reviews");
    return { count: rows.length, snapshotId };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Error al subir el snapshot",
    };
  }
}

async function saveLiquidAssets(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  "use server";

  const user = await getOrCreateUser();
  if (!user || !canEditLiquidAssets(user.accessStatus)) {
    return { error: "No autorizado" };
  }

  const liquidAssetsText = formData.get("liquidAssetsText");
  if (typeof liquidAssetsText !== "string" || !liquidAssetsText.trim()) {
    return { error: "El texto de activos líquidos no puede estar vacío." };
  }

  const result = await upsertLiquidAssets(user.clerkUserId, liquidAssetsText);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/portfolio/upload");
  return { success: true };
}

export default async function PortfolioUploadPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");

  if (!canUploadSnapshots(user.accessStatus)) {
    redirect("/");
  }

  const rows = await getLiquidAssetsForUser(user.clerkUserId);
  const editorText = getLiquidAssetsEditorText(rows);
  const canEdit = canEditLiquidAssets(user.accessStatus);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subir snapshot</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Creá un nuevo snapshot de tu portfolio y actualizá tus activos líquidos
          para el contexto de asignación en reviews.
        </p>
      </div>

      <PortfolioUploadWorkspace
        editorKey={
          rows.find((r) => r.category === LIQUID_EDITOR_CATEGORY)?.updatedAt?.toISOString() ??
          "default"
        }
        editorText={editorText}
        canEditLiquid={canEdit}
        uploadSnapshotCsv={uploadSnapshotCsv}
        uploadSnapshotText={uploadSnapshotText}
        saveLiquidAssets={saveLiquidAssets}
        requestReview={requestReviewAction}
      />
    </div>
  );
}
