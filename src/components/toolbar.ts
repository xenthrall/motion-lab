import { ui, uiIcon } from "./icons";
import { type OptionPicker, type OptionPickerItem, createOptionPicker } from "./option-picker";

export interface ToolbarCallbacks {
  onAspectChange: (id: string) => void;
  onBackgroundChange: (id: string) => void;
  onExport: () => void;
  onRender: () => void;
}

export interface Toolbar {
  aspectPicker: OptionPicker;
  backgroundPicker: OptionPicker;
  setExportEnabled(enabled: boolean): void;
  setExporting(exporting: boolean): void;
  setPickersEnabled(enabled: boolean): void;
  /** Disabled while the backend is unreachable or ffmpeg is missing. */
  setRenderEnabled(enabled: boolean, reason?: string): void;
}

const EXPORT_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-dark/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

// Secondary weight on purpose: "Descargar" is the instant path most previews
// want, and this is the slower, higher-quality one you reach for on a heavy clip.
const RENDER_BUTTON_CLASS =
  "ml-auto inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-ring/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50";

/** The "centralized point" for aspect ratio + background (each opens a
 * mini popover to pick), grouped with the Export action that consumes them. */
export function createToolbar(
  container: Element,
  aspectItems: OptionPickerItem[],
  backgroundItems: OptionPickerItem[],
  callbacks: ToolbarCallbacks,
): Toolbar {
  container.innerHTML = `
    <div class="flex w-full flex-wrap items-center gap-2">
      <div id="aspect-picker"></div>
      <div id="background-picker"></div>
      <button id="render-btn" type="button" class="${RENDER_BUTTON_CLASS}" title="Render offline, frame por frame">
        ${uiIcon(ui.clapperboard)}
        <span>Render HD</span>
      </button>
      <button id="export-btn" type="button" class="${EXPORT_BUTTON_CLASS}">
        <span id="export-icon" class="inline-flex">${uiIcon(ui.download)}</span>
        <span>Descargar</span>
      </button>
    </div>
  `;

  const aspectContainer = container.querySelector<HTMLDivElement>("#aspect-picker");
  const backgroundContainer = container.querySelector<HTMLDivElement>("#background-picker");
  const exportBtn = container.querySelector<HTMLButtonElement>("#export-btn");
  const exportIcon = container.querySelector<HTMLSpanElement>("#export-icon");
  const renderBtn = container.querySelector<HTMLButtonElement>("#render-btn");
  if (!aspectContainer || !backgroundContainer || !exportBtn || !exportIcon || !renderBtn) {
    throw new Error("createToolbar: expected elements were not found after render");
  }

  const aspectPicker = createOptionPicker(
    aspectContainer,
    "Aspecto",
    aspectItems,
    callbacks.onAspectChange,
  );
  const backgroundPicker = createOptionPicker(
    backgroundContainer,
    "Fondo",
    backgroundItems,
    callbacks.onBackgroundChange,
  );
  exportBtn.addEventListener("click", () => callbacks.onExport());
  renderBtn.addEventListener("click", () => callbacks.onRender());

  return {
    aspectPicker,
    backgroundPicker,
    setExportEnabled(enabled: boolean) {
      exportBtn.disabled = !enabled;
    },
    setRenderEnabled(enabled: boolean, reason = "") {
      renderBtn.disabled = !enabled;
      renderBtn.title = enabled ? "Render offline, frame por frame" : reason;
    },
    setExporting(exporting: boolean) {
      exportIcon.innerHTML = exporting
        ? uiIcon(ui.loader, "w-4 h-4 animate-spin")
        : uiIcon(ui.download);
    },
    setPickersEnabled(enabled: boolean) {
      aspectPicker.setEnabled(enabled);
      backgroundPicker.setEnabled(enabled);
    },
  };
}
