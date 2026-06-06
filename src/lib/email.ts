import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function notifyAdminsNewUser(params: {
  email: string;
  clerkUserId: string;
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
  await resend.emails.send({
    from,
    to: adminEmails,
    subject: "Nuevo usuario pendiente de aprobación",
    html: `
      <p>Un nuevo usuario se registró y está <strong>pendiente</strong> de aprobación.</p>
      <ul>
        <li>Email: ${params.email}</li>
        <li>Clerk ID: ${params.clerkUserId}</li>
      </ul>
      <p>Ingresá a la pantalla de administración para aprobar o rechazar el acceso.</p>
    `,
  });
}
