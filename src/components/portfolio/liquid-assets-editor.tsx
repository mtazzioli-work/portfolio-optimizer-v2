"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type SaveState = { error?: string; success?: boolean } | null;

type Props = {
  initialText: string;
  canEdit: boolean;
  saveLiquidAssets: (
    prevState: SaveState,
    formData: FormData,
  ) => Promise<SaveState>;
  onDirtyChange?: (dirty: boolean) => void;
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {pending ? "Guardando…" : "Guardar activos"}
    </button>
  );
}

export function LiquidAssetsEditor({
  initialText,
  canEdit,
  saveLiquidAssets,
  onDirtyChange,
}: Props) {
  const [text, setText] = useState(initialText);
  const [state, formAction] = useActionState(saveLiquidAssets, null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    onDirtyChange?.(text !== initialText);
  }, [text, initialText, onDirtyChange]);

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="font-medium">Activos líquidos</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Declará efectivo, stablecoins, crypto fuera del broker e inmuebles para
          contexto de asignación en tus revisiones. Podés actualizarlos
          independientemente del snapshot.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="liquidAssetsText" value={text} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!canEdit}
          rows={14}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-800 read-only:bg-zinc-50 read-only:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:read-only:bg-zinc-900 dark:read-only:text-zinc-400"
        />
        {canEdit ? (
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              type="button"
              onClick={() => setText(initialText)}
              className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Descartar cambios
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">Solo lectura</p>
        )}
        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Activos líquidos guardados correctamente.
          </p>
        )}
      </form>
    </section>
  );
}
