export default function DeniedPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Acceso denegado</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Tu solicitud de acceso fue rechazada. Si creés que es un error, contactá
        al administrador del sistema.
      </p>
    </div>
  );
}
