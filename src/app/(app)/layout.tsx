import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { AccessGuard } from "@/components/access-guard";
import { NavSidebar } from "@/components/nav-sidebar";
import { getOrCreateUser } from "@/lib/users";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <AccessGuard user={user}>
      <div className="flex min-h-full flex-1">
        <NavSidebar accessStatus={user.accessStatus} role={user.role} />
        <div className="flex min-h-full flex-1 flex-col">
          <header className="flex items-center justify-end border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
            <UserButton />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AccessGuard>
  );
}
