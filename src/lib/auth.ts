import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gte } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth-session";

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth-session";

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 12) {
    return "La contraseña debe tener al menos 12 caracteres";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula";
  }
  if (!/[a-z]/.test(password)) {
    return "La contraseña debe incluir al menos una minúscula";
  }
  if (!/[0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un número";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "La contraseña debe incluir al menos un símbolo";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSecurePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*-_=+";
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => chars[randomBytes(1)[0] % chars.length];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: length - required.length }, () =>
    pick(all),
  );
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(
  userId: string,
  sessionVersion: number,
): Promise<void> {
  const token = await createSessionToken(userId, sessionVersion);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function checkRateLimit(
  email: string,
  ip: string | null,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const normalized = normalizeEmail(email);

  const emailAttempts = await db
    .select({ id: loginAttempts.id })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, normalized),
        gte(loginAttempts.attemptedAt, since),
      ),
    );

  if (emailAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  if (ip) {
    const ipAttempts = await db
      .select({ id: loginAttempts.id })
      .from(loginAttempts)
      .where(
        and(eq(loginAttempts.ip, ip), gte(loginAttempts.attemptedAt, since)),
      );

    if (ipAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      return false;
    }
  }

  return true;
}

export async function recordFailedLoginAttempt(
  email: string,
  ip: string | null,
): Promise<void> {
  await db.insert(loginAttempts).values({
    email: normalizeEmail(email),
    ip,
  });
}
