import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccessGuard } from "@/components/access-guard";
import { LogoutButton } from "@/components/logout-button";
import { NavSidebar } from "@/components/nav-sidebar";
import { getAccessRedirectPath } from "@/lib/access";
import { getCurrentUser } from "@/lib/users";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const pathname = (await headers()).get("x-pathname") ?? "/";
  const accessRedirect = getAccessRedirectPath(
    pathname,
    user.accessStatus,
    user.role,
  );
  if (accessRedirect) {
    redirect(accessRedirect);
  }

  return (
    <AccessGuard user={user}>
      <div className="flex min-h-full flex-1">
        <NavSidebar accessStatus={user.accessStatus} role={user.role} />
        <div className="flex min-h-full flex-1 flex-col">
          <header className="flex items-center justify-end border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
            <LogoutButton email={user.email} />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AccessGuard>
  );
}
