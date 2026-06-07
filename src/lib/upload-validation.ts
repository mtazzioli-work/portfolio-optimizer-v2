export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_POSITIONS = 500;

const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

export function validateCsvFile(file: File): void {
  if (file.size > MAX_CSV_BYTES) {
    throw new Error(
      `El archivo CSV es demasiado grande (máx. ${MAX_CSV_BYTES / 1024 / 1024} MB)`,
    );
  }
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (!name.endsWith(".csv") && !CSV_MIME_TYPES.has(type)) {
    throw new Error("Tipo de archivo inválido: se esperaba un CSV");
  }
}

export function assertPositionCount(count: number): void {
  if (count === 0) {
    throw new Error("No se encontraron posiciones en el CSV");
  }
  if (count > MAX_POSITIONS) {
    throw new Error(`Demasiadas posiciones (máx. ${MAX_POSITIONS})`);
  }
}
