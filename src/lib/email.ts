import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { users } from "@/db/schema";
import { escapeHtml } from "@/lib/html-escape";

type ResendSendResult = Awaited<ReturnType<Resend["emails"]["send"]>>;

function assertResendOk(result: ResendSendResult): void {
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function notifyAdminsNewUser(params: {
  email: string;
  userId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));

  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  if (adminEmails.length === 0) return;

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Portfolio Optimizer <onboarding@resend.dev>";

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: adminEmails,
    subject: "Nuevo usuario pendiente de aprobación",
    html: `
      <p>Un nuevo usuario se registró y está <strong>pendiente</strong> de aprobación.</p>
      <ul>
        <li>Email: ${escapeHtml(params.email)}</li>
        <li>ID: ${escapeHtml(params.userId)}</li>
      </ul>
      <p>Ingresá a la pantalla de administración para aprobar o rechazar el acceso.</p>
    `,
  });
  if (result.error) {
    console.error("[email] Failed to notify admins:", result.error.message);
  }
}

export async function sendTemporaryPasswordEmail(params: {
  email: string;
  password: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Portfolio Optimizer <onboarding@resend.dev>";

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: params.email,
    subject: "Tu nueva contraseña temporal — Portfolio Optimizer",
    html: `
      <p>Se generó una contraseña temporal para tu cuenta:</p>
      <p><strong>${escapeHtml(params.password)}</strong></p>
      <p>Iniciá sesión y cambiá tu contraseña en Configuración lo antes posible.</p>
    `,
  });
  assertResendOk(result);
}

export async function sendPasswordResetEmail(params: {
  email: string;
  resetUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no configurada");
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "Portfolio Optimizer <onboarding@resend.dev>";

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: params.email,
    subject: "Restablecer contraseña — Portfolio Optimizer",
    html: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p><a href="${escapeHtml(params.resetUrl)}">Restablecer contraseña</a></p>
      <p>Este enlace expira en 1 hora. Si no solicitaste este cambio, podés ignorar este email.</p>
    `,
  });
  assertResendOk(result);
}
