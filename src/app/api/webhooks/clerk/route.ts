import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { investmentProfiles, portfolios, users } from "@/db/schema";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";
import { notifyAdminsNewUser } from "@/lib/email";

export async function POST(req: NextRequest) {
  const signingSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  let evt;
  try {
    evt = await verifyWebhook(req, { signingSecret });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, email_addresses, primary_email_address_id } = evt.data;
    const primary =
      email_addresses?.find((e) => e.id === primary_email_address_id) ??
      email_addresses?.[0];
    const email = primary?.email_address;

    if (!email) {
      return NextResponse.json({ ok: true, skipped: "no email" });
    }

    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();
    const isBootstrapAdmin =
      bootstrapEmail && email.toLowerCase() === bootstrapEmail;

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, id))
      .limit(1);

    if (!existing) {
      await db.insert(users).values({
        clerkUserId: id,
        email,
        accessStatus: isBootstrapAdmin ? "active" : "pending",
        role: isBootstrapAdmin ? "admin" : "user",
      });

      await db.insert(portfolios).values({ userId: id });
      await db.insert(investmentProfiles).values({
        userId: id,
        rulesJson: DEFAULT_INVESTMENT_PROFILE,
      });

      if (!isBootstrapAdmin) {
        await notifyAdminsNewUser({ email, clerkUserId: id });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
