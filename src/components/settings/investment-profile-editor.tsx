"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ProfileChipDrawer,
  ProfileChipSidebar,
} from "@/components/settings/profile-chip-sidebar";
import type { ProfileChipSectionWithChips } from "@/lib/profile-chips";

type SaveProfileState = { error?: string; success?: boolean } | null;

type Props = {
  initialText: string;
  canEdit: boolean;
  chipSections: ProfileChipSectionWithChips[];
  hasSavedText: boolean;
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
  chipSections,
  hasSavedText,
  saveProfile,
}: Props) {
  return (
    <InvestmentProfileEditorForm
      key={initialText}
      initialText={initialText}
      canEdit={canEdit}
      chipSections={chipSections}
      hasSavedText={hasSavedText}
      saveProfile={saveProfile}
    />
  );
}

function InvestmentProfileEditorForm({
  initialText,
  canEdit,
  chipSections,
  hasSavedText,
  saveProfile,
}: Props) {
  const [text, setText] = useState(initialText);
  const [state, formAction] = useActionState(saveProfile, null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (value: string, cursor: number) => {
    setText(value);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="font-medium">Personalizar perfil</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Insertá fragmentos desde el panel y completá los valores entre
          corchetes. Guardá el perfil para poder solicitar una review.
        </p>
        {!hasSavedText && canEdit && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Todavía no guardaste un perfil. Completalo y guardalo antes de
            solicitar una review.
          </p>
        )}
      </div>

      <ProfileChipDrawer
        sections={chipSections}
        canEdit={canEdit}
        textareaRef={textareaRef}
        onInsert={handleInsert}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <form action={formAction} className="min-w-0 flex-1 space-y-3">
          <input type="hidden" name="profileText" value={text} />
          <textarea
            ref={textareaRef}
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
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-green-700 dark:text-green-400">
              Perfil guardado correctamente.
            </p>
          )}
        </form>

        <ProfileChipSidebar
          sections={chipSections}
          canEdit={canEdit}
          textareaRef={textareaRef}
          onInsert={handleInsert}
        />
      </div>
    </section>
  );
}
