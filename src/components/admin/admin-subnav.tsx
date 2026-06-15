"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "Usuarios" },
  { href: "/admin/profile-chips", label: "Chips de perfil" },
] as const;

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm">
      {ADMIN_NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              active
                ? "font-medium text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
