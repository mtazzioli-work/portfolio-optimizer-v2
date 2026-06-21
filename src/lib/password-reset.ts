import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";

export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function findValidPasswordResetUserId(
  token: string,
): Promise<string | null> {
  const tokenHash = hashPasswordResetToken(token);
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row?.userId ?? null;
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  const tokenHash = hashPasswordResetToken(token);
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));
}
