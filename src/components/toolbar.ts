import { ui, uiIcon } from "./icons";
import { type OptionPicker, type OptionPickerItem, createOptionPicker } from "./option-picker";

export interface ToolbarCallbacks {
  onAspectChange: (id: string) => void;
  onFileFormatChange: (id: string) => void;
  onExport: () => void;
}

export interface Toolbar {
  aspectPicker: OptionPicker;
  fileFormatPicker: OptionPicker;
  setExportEnabled(enabled: boolean): void;
  setExporting(exporting: boolean): void;
  setPickersEnabled(enabled: boolean): void;
}

const EXPORT_BUTTON_CLASS =
  "ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-dark/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

/** The "centralized point" for aspect ratio + file format (each opens a
 * mini popover to pick), grouped with the Export action that consumes them. */
export function createToolbar(
  container: Element,
  aspectItems: OptionPickerItem[],
  fileFormatItems: OptionPickerItem[],
  callbacks: ToolbarCallbacks,
): Toolbar {
  container.innerHTML = `
    <div class="flex w-full flex-wrap items-center gap-2">
      <div id="aspect-picker"></div>
      <div id="file-format-picker"></div>
      <button id="export-btn" type="button" class="${EXPORT_BUTTON_CLASS}">
        <span id="export-icon" class="inline-flex">${uiIcon(ui.download)}</span>
        <span>Descargar</span>
      </button>
    </div>
  `;

  const aspectContainer = container.querySelector<HTMLDivElement>("#aspect-picker");
  const fileFormatContainer = container.querySelector<HTMLDivElement>("#file-format-picker");
  const exportBtn = container.querySelector<HTMLButtonElement>("#export-btn");
  const exportIcon = container.querySelector<HTMLSpanElement>("#export-icon");
  if (!aspectContainer || !fileFormatContainer || !exportBtn || !exportIcon) {
    throw new Error("createToolbar: expected elements were not found after render");
  }

  const aspectPicker = createOptionPicker(
    aspectContainer,
    "Aspecto",
    aspectItems,
    callbacks.onAspectChange,
  );
  const fileFormatPicker = createOptionPicker(
    fileFormatContainer,
    "Archivo",
    fileFormatItems,
    callbacks.onFileFormatChange,
  );
  exportBtn.addEventListener("click", () => callbacks.onExport());

  return {
    aspectPicker,
    fileFormatPicker,
    setExportEnabled(enabled: boolean) {
      exportBtn.disabled = !enabled;
    },
    setExporting(exporting: boolean) {
      exportIcon.innerHTML = exporting
        ? uiIcon(ui.loader, "w-4 h-4 animate-spin")
        : uiIcon(ui.download);
    },
    setPickersEnabled(enabled: boolean) {
      aspectPicker.setEnabled(enabled);
      fileFormatPicker.setEnabled(enabled);
    },
  };
}
