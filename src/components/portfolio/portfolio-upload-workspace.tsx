"use client";

import { useState } from "react";
import { LiquidAssetsEditor } from "@/components/portfolio/liquid-assets-editor";
import { PortfolioUploadClient } from "@/components/portfolio/portfolio-upload-client";

type SaveState = { error?: string; success?: boolean } | null;

type Props = {
  editorKey: string;
  editorText: string;
  canEditLiquid: boolean;
  uploadSnapshotCsv: (formData: FormData) => Promise<{
    error?: string;
    count?: number;
    snapshotId?: string;
  }>;
  uploadSnapshotText: (formData: FormData) => Promise<{
    error?: string;
    count?: number;
    snapshotId?: string;
  }>;
  saveLiquidAssets: (
    prevState: SaveState,
    formData: FormData,
  ) => Promise<SaveState>;
  requestReview: (snapshotId: string) => Promise<{
    reviewId?: string;
    error?: string;
    existingReviewId?: string;
  }>;
  hasInvestmentProfile: boolean;
};

export function PortfolioUploadWorkspace({
  editorKey,
  editorText,
  canEditLiquid,
  uploadSnapshotCsv,
  uploadSnapshotText,
  saveLiquidAssets,
  requestReview,
  hasInvestmentProfile,
}: Props) {
  const [hasUnsavedLiquidAssets, setHasUnsavedLiquidAssets] = useState(false);

  return (
    <div className="space-y-8">
      <section id="activos-liquidos" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">1. Activos líquidos</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Declaralos antes de subir el snapshot; la revisión los usa junto con
            tus posiciones del broker.
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <strong>Efectivo disponible para invertir:</strong> ese monto es el
          capital que la revisión considerará para asignar nuevas compras.
        </div>

        <LiquidAssetsEditor
          key={editorKey}
          initialText={editorText}
          canEdit={canEditLiquid}
          saveLiquidAssets={saveLiquidAssets}
          onDirtyChange={setHasUnsavedLiquidAssets}
        />
      </section>

      <section id="subir-snapshot" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">2. Snapshot del portfolio</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Subí el CSV de tu cartera para crear una foto actual de tus
            posiciones y solicitar una revisión.
          </p>
        </div>

        <PortfolioUploadClient
          uploadSnapshotCsv={uploadSnapshotCsv}
          uploadSnapshotText={uploadSnapshotText}
          requestReview={requestReview}
          hasUnsavedLiquidAssets={hasUnsavedLiquidAssets}
          hasInvestmentProfile={hasInvestmentProfile}
        />
      </section>
    </div>
  );
}
