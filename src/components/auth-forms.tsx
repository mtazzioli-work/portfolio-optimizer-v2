"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  completePasswordReset,
  requestPasswordReset,
  signIn,
  signUp,
  type AuthActionState,
} from "@/app/auth/actions";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function AuthError({ state }: { state: AuthActionState }) {
  if (!state.error) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {state.error}
    </p>
  );
}

function AuthSuccess({ state }: { state: AuthActionState }) {
  if (!state.success) return null;
  return (
    <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
      {state.success}
    </p>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ingresá con tu email y contraseña.
        </p>
      </div>
      <AuthError state={state} />
      <label className="block space-y-1 text-sm">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <p className="text-right text-sm">
        <Link href="/forgot-password" className="text-zinc-500 underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        ¿No tenés cuenta?{" "}
        <Link href="/sign-up" className="underline">
          Registrate
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {});

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tu acceso quedará pendiente hasta aprobación del administrador.
        </p>
      </div>
      <AuthError state={state} />
      <label className="block space-y-1 text-sm">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Confirmar contraseña</span>
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
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Creando cuenta…" : "Registrarse"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/sign-in" className="underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ingresá tu email y te enviaremos un enlace para elegir una nueva
          contraseña.
        </p>
      </div>
      <AuthError state={state} />
      <AuthSuccess state={state} />
      {!state.success ? (
        <>
          <label className="block space-y-1 text-sm">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Enviando…" : "Enviar enlace"}
          </button>
        </>
      ) : null}
      <p className="text-center text-sm text-zinc-500">
        <Link href="/sign-in" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completePasswordReset, {});

  return (
    <form action={action} className="w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Elegí una contraseña nueva para tu cuenta.
        </p>
      </div>
      <AuthError state={state} />
      <input type="hidden" name="token" value={token} />
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
        <span>Confirmar contraseña</span>
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
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Guardando…" : "Restablecer contraseña"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        <Link href="/sign-in" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
