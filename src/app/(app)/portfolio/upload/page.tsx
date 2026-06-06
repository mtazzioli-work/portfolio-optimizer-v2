export default function PortfolioUploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Subir snapshot</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Creá un nuevo snapshot de tu portfolio. Esto no consume cuota de
        reviews.
      </p>

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="border-b-2 border-zinc-900 px-4 py-2 text-sm font-medium dark:border-zinc-100">
          CSV
        </span>
        <span className="px-4 py-2 text-sm text-zinc-500">Pegar CSV</span>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Arrastrá un archivo CSV de IBKR o exportá tu activity report.
        <br />
        (Implementación del parser en la siguiente fase.)
      </div>
    </div>
  );
}
