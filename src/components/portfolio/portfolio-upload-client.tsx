"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { cn } from "@/lib/utils";

type Tab = "csv" | "paste";

type UploadResult = {
  error?: string;
  count?: number;
  snapshotId?: string;
};

type Props = {
  uploadSnapshotCsv: (formData: FormData) => Promise<UploadResult>;
  uploadSnapshotText: (formData: FormData) => Promise<UploadResult>;
  requestReview: (snapshotId: string) => Promise<{
    reviewId?: string;
    error?: string;
    existingReviewId?: string;
  }>;
  hasUnsavedLiquidAssets?: boolean;
};

function fileIsCsv(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv"
  );
}

export function PortfolioUploadClient({
  uploadSnapshotCsv,
  uploadSnapshotText,
  requestReview,
  hasUnsavedLiquidAssets = false,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("csv");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null);
  const [lastPositionCount, setLastPositionCount] = useState<number | null>(
    null,
  );

  const handleUploadResult = (result: UploadResult) => {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Snapshot creado con ${result.count} posiciones`);
    if (result.snapshotId) {
      setLastSnapshotId(result.snapshotId);
      setLastPositionCount(result.count ?? null);
    }
    router.refresh();
  };

  const handleCsvUpload = async () => {
    if (!file) {
      toast.error("Seleccioná un archivo CSV");
      return;
    }
    if (!fileIsCsv(file)) {
      toast.error("Seleccioná un archivo CSV válido");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadSnapshotCsv(fd);
      if (!result.error) setFile(null);
      handleUploadResult(result);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteUpload = async () => {
    if (!pasteText.trim()) {
      toast.error("Pegá el contenido del CSV");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("csvText", pasteText);
      const result = await uploadSnapshotText(fd);
      handleUploadResult(result);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h2 className="font-medium">Archivo del portfolio</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Subí un CSV de IBKR (activity report) o un export con columnas estándar.
            Esto no consume cuota de reviews.
          </p>
        </div>

        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setTab("csv")}
            className={cn(
              "px-4 py-2 text-sm transition-colors",
              tab === "csv"
                ? "border-b-2 border-zinc-900 font-medium dark:border-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={cn(
              "px-4 py-2 text-sm transition-colors",
              tab === "paste"
                ? "border-b-2 border-zinc-900 font-medium dark:border-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            Pegar CSV
          </button>
        </div>

        {isUploading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            {tab === "csv" ? "Procesando archivo…" : "Procesando contenido…"}
          </div>
        )}

        {tab === "csv" ? (
          <div className="space-y-4">
            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center text-sm transition-colors",
                isDragging
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700",
                isUploading && "pointer-events-none opacity-60",
              )}
              onClick={() => !isUploading && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files[0];
                if (dropped) setFile(dropped);
              }}
            >
              {file ? (
                <p className="text-green-700 dark:text-green-400">{file.name}</p>
              ) : (
                <>
                  Arrastrá un archivo CSV de IBKR o hacé clic para seleccionarlo.
                  <br />
                  <span className="text-xs">
                    Compatible con activity report y exports Flex Query
                  </span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleCsvUpload}
              disabled={isUploading || !file}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isUploading && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {isUploading ? "Procesando archivo…" : "Subir snapshot"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              disabled={isUploading}
              rows={12}
              placeholder="Pegá acá el contenido del CSV…"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={handlePasteUpload}
              disabled={isUploading || !pasteText.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isUploading && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {isUploading ? "Procesando contenido…" : "Subir snapshot"}
            </button>
          </div>
        )}
      </section>

      {lastSnapshotId && (
        <section className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              Snapshot creado con {lastPositionCount ?? "?"} posiciones
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Optimizá tu portafolio con IA. Consume 1 review de tu cuota mensual.
            </p>
            {hasUnsavedLiquidAssets && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                Tenés cambios sin guardar en activos líquidos. Guardalos antes de
                solicitar la review.
              </p>
            )}
          </div>
          <RequestReviewButton
            snapshotId={lastSnapshotId}
            requestReview={requestReview}
            hasUnsavedLiquidAssets={hasUnsavedLiquidAssets}
          />
        </section>
      )}
    </div>
  );
}
