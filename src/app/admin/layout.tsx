import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { LogoutButton } from "@/components/logout-button";
import { NavSidebar } from "@/components/nav-sidebar";
import { getCurrentUser } from "@/lib/users";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-full flex-1">
      <NavSidebar accessStatus={user.accessStatus} role={user.role} />
      <div className="flex min-h-full flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-6">
            <span className="font-semibold">Admin</span>
            <AdminSubnav />
          </div>
          <LogoutButton email={user.email} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
