import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { investmentProfiles } from "@/db/schema";
import { ApplyTemplateForm } from "@/components/settings/apply-template-form";
import { InvestmentProfileEditor } from "@/components/settings/investment-profile-editor";
import {
  DEFAULT_INVESTMENT_PROFILE,
  type InvestmentRules,
} from "@/lib/default-investment-profile";
import {
  INVESTMENT_PROFILE_TEMPLATES,
  getTemplateById,
  type ProfileTemplateId,
} from "@/lib/investment-profile-templates";
import { parseProfileFromEditing, getProfileEditorText } from "@/lib/investment-profile-text";
import { canEditInvestmentProfile } from "@/lib/access";
import { getOrCreateUser } from "@/lib/users";
import { redirect } from "next/navigation";

async function applyTemplate(formData: FormData) {
  "use server";

  const templateId = formData.get("templateId") as ProfileTemplateId;
  const user = await getOrCreateUser();
  if (!user || !canEditInvestmentProfile(user.accessStatus)) {
    throw new Error("No autorizado");
  }

  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error("Plantilla inválida");
  }

  const [existing] = await db
    .select({ id: investmentProfiles.id })
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, user.clerkUserId))
    .limit(1);

  if (existing) {
    await db
      .update(investmentProfiles)
      .set({
        rulesJson: template.rules,
        label: `Estrategia ${template.name}`,
        updatedAt: new Date(),
      })
      .where(eq(investmentProfiles.userId, user.clerkUserId));
  } else {
    await db.insert(investmentProfiles).values({
      userId: user.clerkUserId,
      label: `Estrategia ${template.name}`,
      rulesJson: template.rules,
    });
  }

  revalidatePath("/settings/investment-profile");
}

async function saveProfile(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  "use server";

  const profileText = formData.get("profileText");

  const user = await getOrCreateUser();
  if (!user || !canEditInvestmentProfile(user.accessStatus)) {
    return { error: "No autorizado" };
  }

  if (typeof profileText !== "string" || !profileText.trim()) {
    return { error: "El texto del perfil no puede estar vacío." };
  }

  const [profile] = await db
    .select()
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, user.clerkUserId))
    .limit(1);

  const base =
    (profile?.rulesJson as InvestmentRules | undefined) ??
    DEFAULT_INVESTMENT_PROFILE;

  const parsed = parseProfileFromEditing(profileText, base);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const rulesToSave = {
    ...parsed.rules,
    profileEditorText: profileText,
  };

  if (profile) {
    await db
      .update(investmentProfiles)
      .set({
        rulesJson: rulesToSave,
        updatedAt: new Date(),
      })
      .where(eq(investmentProfiles.userId, user.clerkUserId));
  } else {
    await db.insert(investmentProfiles).values({
      userId: user.clerkUserId,
      rulesJson: rulesToSave,
    });
  }

  revalidatePath("/settings/investment-profile");
  return { success: true };
}

export default async function InvestmentProfilePage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/sign-in");

  const [profile] = await db
    .select()
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, user.clerkUserId))
    .limit(1);

  const canEdit = canEditInvestmentProfile(user.accessStatus);
  const storedRules =
    (profile?.rulesJson as InvestmentRules | undefined) ??
    DEFAULT_INVESTMENT_PROFILE;
  const rules = storedRules;
  const editorText = getProfileEditorText(profile?.rulesJson, rules);
  const activeTemplateId = profile
    ? INVESTMENT_PROFILE_TEMPLATES.find((t) =>
        profile.label.includes(t.name),
      )?.id
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Perfil de inversión</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Elegí una plantilla como punto de partida. Podés personalizar los
        detalles después de aplicarla.
      </p>

      {profile && (
        <p className="text-sm text-zinc-500">
          Perfil actual: <strong>{profile.label}</strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {INVESTMENT_PROFILE_TEMPLATES.map((template) => (
          <article
            key={template.id}
            className="flex flex-col rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="font-medium">{template.name}</h2>
            <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
              {template.summary}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-zinc-500">
              <li>
                Drawdown máx.:{" "}
                {(template.rules.maxPortfolioDrawdown * 100).toFixed(0)}%
              </li>
              <li>Objetivo: {template.rules.objective}</li>
              <li>Rebalanceo: {template.rules.rebalancingPolicy}</li>
            </ul>
            {canEdit ? (
              <ApplyTemplateForm
                templateId={template.id}
                isActive={activeTemplateId === template.id}
                applyTemplate={applyTemplate}
              />
            ) : (
              <p className="mt-4 text-xs text-zinc-400">Solo lectura</p>
            )}
          </article>
        ))}
      </div>

      <InvestmentProfileEditor
        key={profile?.updatedAt?.toISOString() ?? "default"}
        initialText={editorText}
        canEdit={canEdit}
        saveProfile={saveProfile}
      />
    </div>
  );
}
