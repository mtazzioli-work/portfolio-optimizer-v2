export default function WaitingPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Cuenta pendiente</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Usuario pendiente, aguarde su aprobación para optimizar su portafolio.
      </p>
      <p className="text-sm text-zinc-500">
        Mientras tanto podés preparar tu{" "}
        <a
          href="/settings/investment-profile"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          perfil de inversión
        </a>{" "}
        y{" "}
        <a
          href="/settings/liquid-assets"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          activos líquidos
        </a>
        .
      </p>
    </div>
  );
}
