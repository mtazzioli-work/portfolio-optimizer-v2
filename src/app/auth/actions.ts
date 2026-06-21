"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { investmentProfiles, portfolios, users } from "@/db/schema";
import {
  checkRateLimit,
  hashPassword,
  normalizeEmail,
  recordFailedLoginAttempt,
  setSessionCookie,
  validatePasswordPolicy,
  verifyPassword,
  clearSessionCookie,
} from "@/lib/auth";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";
import { notifyAdminsNewUser } from "@/lib/email";
import { warnMissingProductionSecrets } from "@/lib/env";
import { getDbUser } from "@/lib/users";

export type AuthActionState = {
  error?: string;
  success?: string;
};

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

async function getAppOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

async function updateUserPassword(
  userId: string,
  newPassword: string,
  currentSessionVersion: number,
): Promise<number> {
  const passwordHash = await hashPassword(newPassword);
  const nextVersion = currentSessionVersion + 1;

  await db
    .update(users)
    .set({
      passwordHash,
      sessionVersion: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return nextVersion;
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  warnMissingProductionSecrets();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios" };
  }

  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    return { error: policyError };
  }

  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const isBootstrapAdmin = Boolean(
    bootstrapEmail && email === bootstrapEmail,
  );

  const passwordHash = await hashPassword(password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        accessStatus: isBootstrapAdmin ? "active" : "pending",
        role: isBootstrapAdmin ? "admin" : "user",
      })
      .returning();

    if (!created) {
      return { error: "No se pudo crear la cuenta" };
    }

    await db.insert(portfolios).values({ userId: created.id });
    await db.insert(investmentProfiles).values({
      userId: created.id,
      rulesJson: DEFAULT_INVESTMENT_PROFILE,
    });

    if (!isBootstrapAdmin) {
      await notifyAdminsNewUser({ email: created.email, userId: created.id });
    }

    await setSessionCookie(created.id, created.sessionVersion);
  } catch {
    return { error: "Ya existe una cuenta con ese email" };
  }

  redirect("/");
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  warnMissingProductionSecrets();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const ip = await getClientIp();

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios" };
  }

  const allowed = await checkRateLimit(email, ip);
  if (!allowed) {
    return {
      error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await recordFailedLoginAttempt(email, ip);
    return { error: "Email o contraseña incorrectos" };
  }

  await setSessionCookie(user.id, user.sessionVersion);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirect("/sign-in");
}

export async function changePassword(formData: FormData): Promise<AuthActionState> {
  const { getCurrentUser } = await import("@/lib/users");
  const user = await getCurrentUser();
  if (!user) {
    return { error: "No autorizado" };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "La contraseña actual es incorrecta" };
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return { error: policyError };
  }

  if (newPassword !== confirm) {
    return { error: "Las contraseñas nuevas no coinciden" };
  }

  const nextVersion = await updateUserPassword(
    user.id,
    newPassword,
    user.sessionVersion,
  );

  await setSessionCookie(user.id, nextVersion);
  return {};
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const ip = await getClientIp();

  if (!email) {
    return { error: "Email es obligatorio" };
  }

  const allowed = await checkRateLimit(email, ip);
  if (!allowed) {
    return {
      error: "Demasiados intentos. Probá de nuevo en unos minutos.",
    };
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    try {
      const { createPasswordResetToken } = await import("@/lib/password-reset");
      const { sendPasswordResetEmail } = await import("@/lib/email");
      const token = await createPasswordResetToken(user.id);
      const origin = await getAppOrigin();
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail({ email: user.email, resetUrl });
    } catch (err) {
      console.error("[auth] Failed to send password reset email", err);
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("api key")) {
        return {
          error:
            "RESEND_API_KEY inválida. Creá una en resend.com/api-keys (formato re_...) y reiniciá el servidor.",
        };
      }
      return {
        error:
          "No pudimos enviar el email de restablecimiento. Probá más tarde.",
      };
    }
  }

  return {
    success:
      "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
  };
}

export async function completePasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Enlace inválido o expirado" };
  }

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) {
    return { error: policyError };
  }

  if (newPassword !== confirm) {
    return { error: "Las contraseñas no coinciden" };
  }

  const { findValidPasswordResetUserId, consumePasswordResetToken } =
    await import("@/lib/password-reset");

  const userId = await findValidPasswordResetUserId(token);
  if (!userId) {
    return { error: "Enlace inválido o expirado" };
  }

  const [user] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { error: "Enlace inválido o expirado" };
  }

  await updateUserPassword(userId, newPassword, user.sessionVersion);
  await consumePasswordResetToken(token);

  redirect("/sign-in?reset=1");
}

export async function resetUserPassword(userId: string): Promise<void> {
  const { getCurrentUser } = await import("@/lib/users");
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") {
    throw new Error("No autorizado");
  }

  const target = await getDbUser(userId);
  if (!target) {
    throw new Error("Usuario no encontrado");
  }

  const { generateSecurePassword } = await import("@/lib/auth");
  const { sendTemporaryPasswordEmail } = await import("@/lib/email");

  const temporaryPassword = generateSecurePassword();
  await updateUserPassword(userId, temporaryPassword, target.sessionVersion);

  await sendTemporaryPasswordEmail({
    email: target.email,
    password: temporaryPassword,
  });
}
