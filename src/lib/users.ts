import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentProfiles, portfolios, users, type User } from "@/db/schema";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";

export async function getDbUser(clerkUserId: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function getOrCreateUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await getDbUser(userId);
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) return null;

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const isBootstrapAdmin =
    bootstrapEmail && email.toLowerCase() === bootstrapEmail;

  const [created] = await db
    .insert(users)
    .values({
      clerkUserId: userId,
      email,
      accessStatus: isBootstrapAdmin ? "active" : "pending",
      role: isBootstrapAdmin ? "admin" : "user",
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    await db.insert(portfolios).values({ userId: created.clerkUserId });
    await db.insert(investmentProfiles).values({
      userId: created.clerkUserId,
      rulesJson: DEFAULT_INVESTMENT_PROFILE,
    });
    return created;
  }

  return getDbUser(userId);
}
