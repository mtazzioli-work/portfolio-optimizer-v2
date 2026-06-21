import {
  createProfileChip,
  createProfileChipSection,
  deleteProfileChip,
  deleteProfileChipSection,
  updateProfileChip,
  updateProfileChipSection,
} from "@/app/admin/profile-chips/actions";
import { listAllProfileChipSections } from "@/lib/profile-chips";

export default async function AdminProfileChipsPage() {
  const sections = await listAllProfileChipSections();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Chips de perfil</h1>
          <p className="text-sm text-zinc-500">
            Catálogo global de fragmentos para armar el perfil de inversión.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="font-medium">Nueva sección</h2>
        <form action={createProfileChipSection} className="mt-3 flex flex-wrap gap-2">
          <input
            name="title"
            placeholder="Título"
            required
            className="min-w-48 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="sortOrder"
            type="number"
            defaultValue={sections.length + 1}
            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Crear sección
          </button>
        </form>
      </section>

      {sections.map((section) => (
        <section
          key={section.id}
          className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <form action={updateProfileChipSection} className="flex flex-1 flex-wrap gap-2">
              <input type="hidden" name="id" value={section.id} />
              <input
                name="title"
                defaultValue={section.title}
                className="min-w-48 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                name="sortOrder"
                type="number"
                defaultValue={section.sortOrder}
                className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button type="submit" className="text-sm underline">
                Guardar sección
              </button>
            </form>
            <form action={deleteProfileChipSection.bind(null, section.id)}>
              <button
                type="submit"
                className="text-sm text-red-600 underline dark:text-red-400"
              >
                Eliminar sección
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {section.chips.map((chip) => (
              <form
                key={chip.id}
                action={updateProfileChip}
                className="space-y-2 rounded border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <input type="hidden" name="id" value={chip.id} />
                <div className="flex flex-wrap gap-2">
                  <input
                    name="label"
                    defaultValue={chip.label}
                    className="min-w-40 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={chip.sortOrder}
                    className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked={chip.isActive}
                    />
                    Activo
                  </label>
                </div>
                <textarea
                  name="insertText"
                  defaultValue={chip.insertText}
                  rows={3}
                  className="w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
                <div className="flex gap-3">
                  <button type="submit" className="text-sm underline">
                    Guardar chip
                  </button>
                  <button
                    type="submit"
                    formAction={deleteProfileChip.bind(null, chip.id)}
                    className="text-sm text-red-600 underline dark:text-red-400"
                  >
                    Eliminar
                  </button>
                </div>
              </form>
            ))}
          </div>

          <form action={createProfileChip} className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="text-sm font-medium">Nuevo chip</p>
            <input type="hidden" name="sectionId" value={section.id} />
            <div className="flex flex-wrap gap-2">
              <input
                name="label"
                placeholder="Etiqueta"
                required
                className="min-w-40 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                name="sortOrder"
                type="number"
                defaultValue={section.chips.length}
                className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <textarea
              name="insertText"
              placeholder="Texto a insertar"
              required
              rows={3}
              className="w-full rounded border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" className="text-sm underline">
              Agregar chip
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}
