import Link from "next/link";
import { Check, Lock } from "lucide-react";
import type { OnboardingStep } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type Props = {
  steps: OnboardingStep[];
};

export function OnboardingChecklist({ steps }: Props) {
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Guía de inicio</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Completá estos pasos para usar el optimizador por primera vez.
        </p>
      </div>

      <div className="mb-5 flex gap-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              step.status === "complete"
                ? "bg-zinc-900 dark:bg-zinc-100"
                : "bg-zinc-200 dark:bg-zinc-800",
            )}
            aria-hidden
          />
        ))}
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        {completedCount} de {steps.length} pasos completados
      </p>

      <ol className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "rounded-md border px-4 py-3",
              step.status === "complete"
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
                : step.status === "locked"
                  ? "border-zinc-100 bg-zinc-50/50 opacity-75 dark:border-zinc-900 dark:bg-zinc-950"
                  : "border-zinc-200 dark:border-zinc-800",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  step.status === "complete"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : step.status === "locked"
                      ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      : "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
                )}
                aria-hidden
              >
                {step.status === "complete" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : step.status === "locked" ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  step.id
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {step.description}
                </p>
                {step.status === "locked" && step.lockedReason ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    {step.lockedReason}
                  </p>
                ) : null}
                {step.status !== "complete" && step.status !== "locked" ? (
                  <Link
                    href={step.href}
                    className="mt-2 inline-block text-sm font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                  >
                    {step.ctaLabel} →
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
