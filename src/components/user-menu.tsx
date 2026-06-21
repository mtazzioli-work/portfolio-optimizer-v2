"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(email);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-700 sm:hidden dark:bg-zinc-800 dark:text-zinc-200",
          )}
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden max-w-[200px] truncate text-zinc-600 sm:inline dark:text-zinc-400">
          {email}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[12rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          <Link
            href="/settings/password"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            Cambiar contraseña
          </Link>
          <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
