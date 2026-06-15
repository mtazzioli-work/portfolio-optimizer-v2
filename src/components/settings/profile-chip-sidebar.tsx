"use client";

import type { RefObject } from "react";
import { useState } from "react";
import type { ProfileChipSectionWithChips } from "@/lib/profile-chips";
import { insertAtCursor } from "@/lib/insert-at-cursor";

type Props = {
  sections: ProfileChipSectionWithChips[];
  canEdit: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onInsert: (value: string, cursor: number) => void;
};

function ChipButton({
  label,
  insertText,
  disabled,
  onInsert,
}: {
  label: string;
  insertText: string;
  disabled: boolean;
  onInsert: (text: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onInsert(insertText)}
      title={insertText}
      className="rounded-full border border-zinc-300 px-2.5 py-1 text-left text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-400 dark:hover:bg-zinc-900"
    >
      {label}
    </button>
  );
}

function ChipSections({
  sections,
  canEdit,
  textareaRef,
  onInsert,
}: Props) {
  const handleInsert = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { value, cursor } = insertAtCursor(textarea, text);
    onInsert(value, cursor);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-4">
      {sections.map((section) =>
        section.chips.length === 0 ? null : (
          <div key={section.id}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {section.title}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {section.chips.map((chip) => (
                <ChipButton
                  key={chip.id}
                  label={chip.label}
                  insertText={chip.insertText}
                  disabled={!canEdit}
                  onInsert={handleInsert}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function ProfileChipSidebar(props: Props) {
  return (
  <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium">Fragmentos</h2>
        <p className="mb-3 text-xs text-zinc-500">
          Hacé click para insertar en el cursor del perfil.
        </p>
        <ChipSections {...props} />
      </div>
    </aside>
  );
}

export function ProfileChipDrawer(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      >
        {open ? "Ocultar fragmentos" : "Agregar fragmento"}
      </button>
      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <ChipSections {...props} />
        </div>
      )}
    </div>
  );
}
