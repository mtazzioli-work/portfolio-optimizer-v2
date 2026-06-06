import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { investmentProfiles } from "@/db/schema";
import {
  INVESTMENT_PROFILE_TEMPLATES,
  getTemplateById,
  type ProfileTemplateId,
} from "@/lib/investment-profile-templates";
import { canEditInvestmentProfile } from "@/lib/access";
import { getOrCreateUser } from "@/lib/users";
import { redirect } from "next/navigation";

async function applyTemplate(formData: FormData) {
  "use server";

  const user = await getOrCreateUser();
  if (!user || !canEditInvestmentProfile(user.accessStatus)) {
    throw new Error("No autorizado");
  }

  const templateId = formData.get("templateId") as ProfileTemplateId;
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error("Plantilla inválida");
  }

  await db
    .update(investmentProfiles)
    .set({
      rulesJson: template.rules,
      label: `Estrategia ${template.name}`,
      updatedAt: new Date(),
    })
    .where(eq(investmentProfiles.userId, user.clerkUserId));

  revalidatePath("/settings/investment-profile");
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
              <form action={applyTemplate} className="mt-4">
                <input type="hidden" name="templateId" value={template.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Usar esta plantilla
                </button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-zinc-400">Solo lectura</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
