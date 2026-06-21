import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { getSessionFromCookies } from "@/lib/auth";
import { warnMissingProductionSecrets } from "@/lib/env";

export async function getDbUser(id: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  warnMissingProductionSecrets();

  const session = await getSessionFromCookies();
  if (!session) return null;

  const user = await getDbUser(session.userId);
  if (!user) return null;

  if (user.sessionVersion !== session.sessionVersion) {
    return null;
  }

  return user;
}
