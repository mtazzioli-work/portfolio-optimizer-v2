import { getOrCreateUser } from "@/lib/users";
import { getQuotaUsage } from "@/lib/quota";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  active: "Activo",
  denied: "Denegado",
  paused: "Suspendido",
};

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  if (!user) return null;

  const quota =
    user.accessStatus === "active"
      ? await getQuotaUsage(user)
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Bienvenido. Acá verás el resumen de tu portfolio cuando subas snapshots.
      </p>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Estado de acceso</h2>
        <p className="mt-1 text-lg font-semibold">
          {STATUS_LABELS[user.accessStatus] ?? user.accessStatus}
        </p>
        {user.accessStatus === "pending" && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Usuario pendiente, aguarde su aprobación para optimizar su
            portafolio. Mientras tanto podés configurar tu perfil de inversión y
            activos líquidos.
          </p>
        )}
        {user.accessStatus === "paused" && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Tu cuenta está suspendida temporalmente. Podés ver el historial y
            editar configuración, pero no subir snapshots ni solicitar reviews.
          </p>
        )}
      </section>

      {quota && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-500">Cuota de reviews</h2>
          <p className="mt-1 text-lg">
            {quota.used} / {quota.limit} usadas este mes
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {quota.remaining} restantes (mes calendario, Argentina)
          </p>
        </section>
      )}
    </div>
  );
}
