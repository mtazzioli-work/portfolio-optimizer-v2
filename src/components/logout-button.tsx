"use client";

import { signOut } from "@/app/auth/actions";

export function LogoutButton({ email }: { email?: string }) {
  return (
    <div className="flex items-center gap-3">
      {email ? (
        <span className="hidden text-sm text-zinc-500 sm:inline">{email}</span>
      ) : null}
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
