"use client";

import { useActionState } from "react";
import { changePassword, type AuthActionState } from "@/app/auth/actions";

const inputClass =
  "w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: AuthActionState, formData: FormData) =>
      changePassword(formData),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span>Contraseña actual</span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Nueva contraseña</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Confirmar nueva contraseña</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
        />
      </label>
      <p className="text-xs text-zinc-500">
        Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
