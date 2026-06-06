"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type SaveProfileState = { error?: string; success?: boolean } | null;

type Props = {
  initialText: string;
  canEdit: boolean;
  saveProfile: (
    prevState: SaveProfileState,
    formData: FormData,
  ) => Promise<SaveProfileState>;
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {pending ? "Guardando…" : "Guardar perfil"}
    </button>
  );
}

export function InvestmentProfileEditor({
  initialText,
  canEdit,
  saveProfile,
}: Props) {
  const [text, setText] = useState(initialText);
  const [state, formAction] = useActionState(saveProfile, null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="font-medium">Personalizar perfil</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Editá los valores del texto según tus preferencias. Al aplicar una
          plantilla, este contenido se actualiza con la plantilla seleccionada.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="profileText" value={text} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!canEdit}
          rows={22}
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
            Perfil guardado correctamente.
          </p>
        )}
      </form>
    </section>
  );
}
