"use client";

import { useFormStatus } from "react-dom";
import type { ProfileTemplateId } from "@/lib/investment-profile-templates";

type Props = {
  templateId: ProfileTemplateId;
  isActive: boolean;
  hasExistingText: boolean;
  applyTemplate: (formData: FormData) => Promise<void>;
};

function SubmitButton({ isActive }: Pick<Props, "isActive">) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {pending
        ? "Aplicando…"
        : isActive
          ? "Plantilla activa"
          : "Usar esta plantilla"}
    </button>
  );
}

export function ApplyTemplateForm({
  templateId,
  isActive,
  hasExistingText,
  applyTemplate,
}: Props) {
  const handleSubmit = async (formData: FormData) => {
    if (
      hasExistingText &&
      !window.confirm(
        "Aplicar esta plantilla reemplazará el texto del perfil. ¿Continuar?",
      )
    ) {
      return;
    }
    await applyTemplate(formData);
  };

  return (
    <form action={handleSubmit} className="mt-4">
      <input type="hidden" name="templateId" value={templateId} />
      <SubmitButton isActive={isActive} />
    </form>
  );
}
