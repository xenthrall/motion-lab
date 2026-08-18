import type { ExportFormat } from "./capture";

export interface FileFormatPreset {
  id: ExportFormat;
  label: string;
  description: string;
}

export const FILE_FORMATS: FileFormatPreset[] = [
  {
    id: "mp4",
    label: "MP4",
    description: "Fondo sólido — listo para subir directo a redes sociales.",
  },
  {
    id: "webm-transparent",
    label: "WebM transparente",
    description: "Sin fondo — para usar como asset reutilizable (overlays, edición, web).",
  },
];

export const DEFAULT_FILE_FORMAT: ExportFormat = "mp4";

export function getFileFormat(id: string): FileFormatPreset {
  return FILE_FORMATS.find((format) => format.id === id) ?? FILE_FORMATS[0];
}
