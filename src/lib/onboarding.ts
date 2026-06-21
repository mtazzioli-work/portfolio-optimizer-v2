import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import type { AccessStatus } from "@/db/schema";
import { portfolios, reviews } from "@/db/schema";
import { userHasSavedInvestmentProfile } from "@/lib/investment-profile";
import {
  buildLiquidSummary,
  getLiquidAssetsForUser,
} from "@/lib/liquid-assets";

export type OnboardingStepId = 1 | 2 | 3 | 4 | 5;

export type OnboardingStepStatus = "complete" | "available" | "locked";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  status: OnboardingStepStatus;
  lockedReason?: string;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  isComplete: boolean;
};

const PENDING_LOCKED_REASON =
  "Disponible cuando tu acceso sea aprobado";

const STEP_DEFINITIONS: Omit<
  OnboardingStep,
  "status" | "lockedReason"
>[] = [
  {
    id: 1,
    title: "Crear perfil de inversión",
    description:
      "Definí tus reglas y objetivos; se usarán en cada revisión del optimizador.",
    href: "/settings/investment-profile",
    ctaLabel: "Ir al perfil",
  },
  {
    id: 2,
    title: "Definir activos líquidos",
    description:
      "Indicá el efectivo disponible para invertir: ese monto es el capital que la revisión usará para asignar nuevas compras.",
    href: "/portfolio/upload#activos-liquidos",
    ctaLabel: "Definir activos",
  },
  {
    id: 3,
    title: "Subir snapshot",
    description:
      "Subí el CSV de tu portfolio para crear una foto actual de tus posiciones.",
    href: "/portfolio/upload#subir-snapshot",
    ctaLabel: "Subir snapshot",
  },
  {
    id: 4,
    title: "Obtener una revisión",
    description:
      "Solicitá una revisión sobre tu snapshot; el optimizador generará recomendaciones con IA.",
    href: "/portfolio/upload#subir-snapshot",
    ctaLabel: "Solicitar revisión",
  },
  {
    id: 5,
    title: "Consultar historial de revisiones",
    description:
      "Visitá la lista de revisiones para ver el historial y volver a consultar resultados anteriores.",
    href: "/reviews",
    ctaLabel: "Ver historial de revisiones",
  },
];

export function shouldShowOnboardingChecklist(
  accessStatus: AccessStatus,
): boolean {
  return accessStatus === "pending" || accessStatus === "active";
}

export async function userHasLiquidForInvesting(
  userId: string,
): Promise<boolean> {
  const rows = await getLiquidAssetsForUser(userId);
  const summary = buildLiquidSummary(rows);
  return summary.liquidForInvesting > 0;
}

async function userHasCurrentSnapshot(userId: string): Promise<boolean> {
  const [portfolio] = await db
    .select({ currentSnapshotId: portfolios.currentSnapshotId })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  return Boolean(portfolio?.currentSnapshotId);
}

async function userHasDoneReview(userId: string): Promise<boolean> {
  const [review] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.status, "done")))
    .limit(1);

  return Boolean(review);
}

type StepCompletion = {
  profileSaved: boolean;
  liquidForInvesting: boolean;
  hasSnapshot: boolean;
  hasDoneReview: boolean;
  reviewsListSeen: boolean;
};

async function getStepCompletion(
  userId: string,
  reviewsListSeen: boolean,
): Promise<StepCompletion> {
  const profileSaved = await userHasSavedInvestmentProfile(userId);
  const liquidForInvesting = await userHasLiquidForInvesting(userId);
  const hasSnapshot = await userHasCurrentSnapshot(userId);
  const hasDoneReview = await userHasDoneReview(userId);

  return {
    profileSaved,
    liquidForInvesting,
    hasSnapshot,
    hasDoneReview,
    reviewsListSeen,
  };
}

function isStepComplete(id: OnboardingStepId, completion: StepCompletion): boolean {
  switch (id) {
    case 1:
      return completion.profileSaved;
    case 2:
      return completion.liquidForInvesting;
    case 3:
      return completion.hasSnapshot;
    case 4:
      return completion.hasDoneReview;
    case 5:
      return completion.reviewsListSeen;
  }
}

function isStepLocked(
  id: OnboardingStepId,
  accessStatus: AccessStatus,
): boolean {
  if (accessStatus === "active") {
    return false;
  }
  if (accessStatus === "pending") {
    return id >= 2;
  }
  return true;
}

export async function getOnboardingProgress(
  userId: string,
  accessStatus: AccessStatus,
  reviewsListSeen: boolean,
): Promise<OnboardingProgress> {
  const completion = await getStepCompletion(userId, reviewsListSeen);

  const steps: OnboardingStep[] = STEP_DEFINITIONS.map((definition) => {
    const complete = isStepComplete(definition.id, completion);
    const locked = !complete && isStepLocked(definition.id, accessStatus);

    let status: OnboardingStepStatus = "available";
    if (complete) {
      status = "complete";
    } else if (locked) {
      status = "locked";
    }

    return {
      ...definition,
      status,
      lockedReason:
        status === "locked" ? PENDING_LOCKED_REASON : undefined,
    };
  });

  return {
    steps,
    isComplete: steps.every((step) => step.status === "complete"),
  };
}
