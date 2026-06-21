"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessStatus, UserRole } from "@/db/schema";

type NavItem = {
  href: string;
  label: string;
  show?: (ctx: { accessStatus: AccessStatus; role: UserRole }) => boolean;
};

const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Panel" },
  {
    href: "/settings/investment-profile",
    label: "Perfil de inversión",
    show: ({ accessStatus }) =>
      accessStatus === "active" ||
      accessStatus === "pending" ||
      accessStatus === "paused",
  },
  {
    href: "/portfolio/upload",
    label: "Subir snapshot",
    show: ({ accessStatus }) => accessStatus === "active",
  },
  {
    href: "/reviews",
    label: "Revisiones",
    show: ({ accessStatus }) =>
      accessStatus === "active" || accessStatus === "paused",
  },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Administración de usuarios" },
  { href: "/admin/profile-chips", label: "Chips de perfil de inversión" },
];

function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

export function NavSidebar({
  accessStatus,
  role,
}: {
  accessStatus: AccessStatus;
  role: UserRole;
}) {
  const pathname = usePathname();
  const ctx = { accessStatus, role };
  const mainItems = MAIN_NAV_ITEMS.filter((item) => !item.show || item.show(ctx));
  const isAdmin = role === "admin";
  const onAdminRoute = pathname.startsWith("/admin");
  const [adminManuallyOpen, setAdminManuallyOpen] = useState(false);
  const adminOpen = onAdminRoute || adminManuallyOpen;

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Portfolio Optimizer
      </p>
      <nav className="flex flex-col gap-1">
        {mainItems.map((item) => {
          const active = isNavItemActive(item.href, pathname);
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

        {isAdmin ? (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setAdminManuallyOpen((prev) => !prev)}
              aria-expanded={adminOpen}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Administración
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  adminOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {adminOpen ? (
              <div className="mt-1 flex flex-col gap-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
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
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
