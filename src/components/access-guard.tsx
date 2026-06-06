"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@/db/schema";
import {
  canAccessPath,
  shouldRedirectToDenied,
  shouldRedirectToWaiting,
} from "@/lib/access";

export function AccessGuard({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirectToDenied(pathname, user.accessStatus)) {
      router.replace("/denied");
      return;
    }
    if (shouldRedirectToWaiting(pathname, user.accessStatus)) {
      router.replace("/waiting");
      return;
    }
    if (!canAccessPath(pathname, user.accessStatus, user.role)) {
      if (user.accessStatus === "denied") {
        router.replace("/denied");
      } else if (user.accessStatus === "pending") {
        router.replace("/waiting");
      } else {
        router.replace("/");
      }
    }
  }, [pathname, router, user]);

  return <>{children}</>;
}
