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
};

export function PortfolioUploadWorkspace({
  editorKey,
  editorText,
  canEditLiquid,
  uploadSnapshotCsv,
  uploadSnapshotText,
  saveLiquidAssets,
  requestReview,
}: Props) {
  const [hasUnsavedLiquidAssets, setHasUnsavedLiquidAssets] = useState(false);

  return (
    <div className="space-y-6">
      <PortfolioUploadClient
        uploadSnapshotCsv={uploadSnapshotCsv}
        uploadSnapshotText={uploadSnapshotText}
        requestReview={requestReview}
        hasUnsavedLiquidAssets={hasUnsavedLiquidAssets}
      />

      <LiquidAssetsEditor
        key={editorKey}
        initialText={editorText}
        canEdit={canEditLiquid}
        saveLiquidAssets={saveLiquidAssets}
        onDirtyChange={setHasUnsavedLiquidAssets}
      />
    </div>
  );
}
