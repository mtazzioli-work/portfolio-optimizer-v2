"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AccessStatus, UserRole } from "@/db/schema";

type NavItem = {
  href: string;
  label: string;
  show?: (ctx: { accessStatus: AccessStatus; role: UserRole }) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  {
    href: "/portfolio/upload",
    label: "Subir snapshot",
    show: ({ accessStatus }) => accessStatus === "active",
  },
  {
    href: "/history",
    label: "Historial",
    show: ({ accessStatus }) =>
      accessStatus === "active" || accessStatus === "paused",
  },
  {
    href: "/reviews",
    label: "Reviews",
    show: ({ accessStatus }) =>
      accessStatus === "active" || accessStatus === "paused",
  },
  {
    href: "/settings/investment-profile",
    label: "Perfil de inversión",
    show: ({ accessStatus }) =>
      accessStatus === "active" ||
      accessStatus === "pending" ||
      accessStatus === "paused",
  },
  {
    href: "/settings/liquid-assets",
    label: "Activos líquidos",
    show: ({ accessStatus }) =>
      accessStatus === "active" ||
      accessStatus === "pending" ||
      accessStatus === "paused",
  },
  {
    href: "/admin",
    label: "Admin",
    show: ({ role }) => role === "admin",
  },
];

export function NavSidebar({
  accessStatus,
  role,
}: {
  accessStatus: AccessStatus;
  role: UserRole;
}) {
  const pathname = usePathname();
  const ctx = { accessStatus, role };
  const items = NAV_ITEMS.filter((item) => !item.show || item.show(ctx));

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Portfolio Optimizer
      </p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
