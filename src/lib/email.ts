import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { escapeHtml } from "@/lib/html-escape";

const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_FROM =
  "Portfolio Optimizer <marcelo.h.tazzioli@gmail.com>";

function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

function parseSender(from: string): { name?: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: from };
}

async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY no configurada");
  }

  const from = getFromAddress();
  const recipients = (Array.isArray(params.to) ? params.to : [params.to]).map(
    (email) => ({ email }),
  );

  const response = await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(from),
      to: recipients,
      subject: params.subject,
      htmlContent: params.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }
}

export async function notifyAdminsNewUser(params: {
  email: string;
  userId: string;
}): Promise<void> {
  if (!isBrevoConfigured()) return;

  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));

  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  if (adminEmails.length === 0) return;

  try {
    await sendEmail({
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Failed to notify admins:", message);
  }
}

export async function sendTemporaryPasswordEmail(params: {
  email: string;
  password: string;
}): Promise<void> {
  if (!isBrevoConfigured()) {
    throw new Error("BREVO_API_KEY no configurada");
  }

  await sendEmail({
    to: params.email,
    subject: "Tu nueva contraseña temporal — Portfolio Optimizer",
    html: `
      <p>Se generó una contraseña temporal para tu cuenta:</p>
      <p><strong>${escapeHtml(params.password)}</strong></p>
      <p>Iniciá sesión y cambiá tu contraseña en Configuración lo antes posible.</p>
    `,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  resetUrl: string;
}): Promise<void> {
  if (!isBrevoConfigured()) {
    throw new Error("BREVO_API_KEY no configurada");
  }

  await sendEmail({
    to: params.email,
    subject: "Restablecer contraseña — Portfolio Optimizer",
    html: `
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p><a href="${escapeHtml(params.resetUrl)}">Restablecer contraseña</a></p>
      <p>Este enlace expira en 1 hora. Si no solicitaste este cambio, podés ignorar este email.</p>
    `,
  });
}
