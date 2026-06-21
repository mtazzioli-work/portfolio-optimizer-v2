import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  resetUserPassword,
  updateMonthlyReviewLimitDefault,
  updateUserAccessStatus,
  updateUserMonthlyReviewLimitFromForm,
} from "@/app/admin/actions";
import {
  countClaudeReviewsThisMonth,
  getEffectiveLimit,
  getMonthlyTokenUsage,
} from "@/lib/quota";
import { formatNumber, formatUsd } from "@/lib/review-amounts";
import { getMonthlyReviewLimitDefault } from "@/lib/settings";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const displayed =
    filter === "pending"
      ? allUsers.filter((u) => u.accessStatus === "pending")
      : allUsers;

  const defaultLimit = await getMonthlyReviewLimitDefault();

  const rows = await Promise.all(
    displayed.map(async (u) => {
      const used = await countClaudeReviewsThisMonth(u.id);
      const limit = await getEffectiveLimit(u);
      const tokens = await getMonthlyTokenUsage(u.id);
      return { user: u, used, limit, tokens };
    }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Administración</h1>
        <p className="text-sm text-zinc-500">
          Metadata de cuentas únicamente (sin snapshots ni reviews).
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Límite global de reviews</h2>
        <form action={updateMonthlyReviewLimitDefault} className="mt-3 flex gap-2">
          <input
            type="number"
            name="limit"
            min={0}
            defaultValue={defaultLimit}
            className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            required
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Guardar default
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Usuarios</h2>
          <div className="flex gap-2 text-sm">
            <a href="/admin" className="underline">
              Todos
            </a>
            <a href="/admin?filter=pending" className="underline">
              Pendientes
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Reviews / límite</th>
                <th className="px-3 py-2">Tokens / costo mes</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user: u, used, limit, tokens }) => (
                <tr
                  key={u.id}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.accessStatus}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">
                    {used} / {limit}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {tokens.totalTokens > 0 ? (
                      <>
                        {formatNumber(tokens.totalTokens)} · ~
                        {formatUsd(tokens.totalCostUsd, { decimals: 2 })}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.accessStatus === "pending" && (
                        <>
                          <form
                            action={updateUserAccessStatus.bind(
                              null,
                              u.id,
                              "active",
                            )}
                          >
                            <button
                              type="submit"
                              className="rounded bg-green-700 px-2 py-0.5 text-xs text-white"
                            >
                              Aprobar
                            </button>
                          </form>
                          <form
                            action={updateUserAccessStatus.bind(
                              null,
                              u.id,
                              "denied",
                            )}
                          >
                            <button
                              type="submit"
                              className="rounded bg-red-700 px-2 py-0.5 text-xs text-white"
                            >
                              Rechazar
                            </button>
                          </form>
                        </>
                      )}
                      {u.accessStatus === "active" && (
                        <form
                          action={updateUserAccessStatus.bind(
                            null,
                            u.id,
                            "paused",
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded bg-amber-700 px-2 py-0.5 text-xs text-white"
                          >
                            Suspender
                          </button>
                        </form>
                      )}
                      {u.accessStatus === "paused" && (
                        <form
                          action={updateUserAccessStatus.bind(
                            null,
                            u.id,
                            "active",
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded bg-green-700 px-2 py-0.5 text-xs text-white"
                          >
                            Reactivar
                          </button>
                        </form>
                      )}
                      {u.accessStatus === "denied" && (
                        <form
                          action={updateUserAccessStatus.bind(
                            null,
                            u.id,
                            "active",
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded bg-green-700 px-2 py-0.5 text-xs text-white"
                          >
                            Rehabilitar
                          </button>
                        </form>
                      )}
                    </div>
                    <form
                      action={resetUserPassword.bind(null, u.id)}
                      className="mt-2"
                    >
                      <button
                        type="submit"
                        className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-white"
                      >
                        Resetear contraseña
                      </button>
                    </form>
                    <form
                      action={updateUserMonthlyReviewLimitFromForm.bind(
                        null,
                        u.id,
                      )}
                      className="mt-2 flex items-center gap-1"
                    >
                      <input
                        type="number"
                        name="limit"
                        min={0}
                        placeholder={
                          u.monthlyReviewLimit != null
                            ? String(u.monthlyReviewLimit)
                            : `def ${limit}`
                        }
                        className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700"
                      />
                      <button type="submit" className="text-xs underline">
                        Límite
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
