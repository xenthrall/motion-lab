import { experimentIcon } from "./experiment-icons";
import { ASPECT_ICONS } from "./format-icons";
import { brandIcon, transparencySwatch, ui, uiIcon } from "./icons";

export interface ControlOption {
  id: string;
  label: string;
}

export interface ControlsOptions {
  experiments: ControlOption[];
  aspects: ControlOption[];
  fileFormats: ControlOption[];
}

export interface ControlsCallbacks {
  onExperimentChange: (id: string) => void;
  onAspectChange: (id: string) => void;
  onFileFormatChange: (id: string) => void;
  onPlayToggle: () => void;
  onRestart: () => void;
  onExport: () => void;
}

export interface Controls {
  setExportEnabled(enabled: boolean): void;
  setExporting(exporting: boolean): void;
  setPlaying(playing: boolean): void;
  setPlaybackControlsEnabled(enabled: boolean): void;
}

const PILL_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-neutral-100 aria-pressed:border-brand-ring/50 aria-pressed:bg-brand/15 aria-pressed:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/5";

const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 sm:ml-auto";

function renderExperimentPill(option: ControlOption, active: boolean): string {
  return `
    <button type="button" data-value="${option.id}" class="${PILL_CLASS}" aria-pressed="${active}">
      ${uiIcon(experimentIcon(option.id))}
      <span>${option.label}</span>
    </button>
  `;
}

function renderAspectPill(option: ControlOption, active: boolean): string {
  const icons = ASPECT_ICONS[option.id];
  return `
    <button type="button" data-value="${option.id}" class="${PILL_CLASS}" aria-pressed="${active}">
      ${uiIcon(icons?.shape ?? ui.square)}
      <span>${option.label}</span>
      ${icons ? brandIcon(icons.brand, "w-3.5 h-3.5 opacity-60") : ""}
    </button>
  `;
}

function renderFileFormatPill(option: ControlOption, active: boolean): string {
  const swatch = option.id === "webm-transparent" ? transparencySwatch() : uiIcon(ui.film);
  return `
    <button type="button" data-value="${option.id}" class="${PILL_CLASS}" aria-pressed="${active}">
      ${swatch}
      <span>${option.label}</span>
    </button>
  `;
}

function wirePillGroup(root: Element, onChange: (id: string) => void): HTMLButtonElement[] {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-value]"));
  for (const button of buttons) {
    button.addEventListener("click", () => {
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      onChange(button.dataset.value ?? "");
    });
  }
  return buttons;
}

export function createControls(
  container: Element,
  options: ControlsOptions,
  callbacks: ControlsCallbacks,
): Controls {
  const { experiments, aspects, fileFormats } = options;

  container.innerHTML = `
    <div class="flex flex-col gap-5">
      <div>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Experimento</h2>
        <div id="experiment-group" role="group" class="flex flex-wrap gap-2">
          ${experiments.map((option, i) => renderExperimentPill(option, i === 0)).join("")}
        </div>
      </div>

      <div>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Relación de aspecto</h2>
        <div id="aspect-group" role="group" class="flex flex-wrap gap-2">
          ${aspects.map((option, i) => renderAspectPill(option, i === 0)).join("")}
        </div>
      </div>

      <div>
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Archivo</h2>
        <div id="file-format-group" role="group" class="flex flex-wrap gap-2">
          ${fileFormats.map((option, i) => renderFileFormatPill(option, i === 0)).join("")}
        </div>
      </div>

      <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
        <div class="flex gap-2">
          <button id="play-btn" type="button" class="${SECONDARY_BUTTON_CLASS}">
            <span id="play-icon" class="inline-flex">${uiIcon(ui.play)}</span>
            <span id="play-label">Reproducir</span>
          </button>
          <button id="restart-btn" type="button" class="${SECONDARY_BUTTON_CLASS}">
            ${uiIcon(ui.restart)}
            Reiniciar
          </button>
        </div>
        <button id="export-btn" type="button" class="${PRIMARY_BUTTON_CLASS}">
          <span id="export-icon" class="inline-flex">${uiIcon(ui.download)}</span>
          Descargar video
        </button>
      </div>
    </div>
  `;

  const experimentGroup = container.querySelector<HTMLDivElement>("#experiment-group");
  const aspectGroup = container.querySelector<HTMLDivElement>("#aspect-group");
  const fileFormatGroup = container.querySelector<HTMLDivElement>("#file-format-group");
  const playBtn = container.querySelector<HTMLButtonElement>("#play-btn");
  const playIcon = container.querySelector<HTMLSpanElement>("#play-icon");
  const playLabel = container.querySelector<HTMLSpanElement>("#play-label");
  const restartBtn = container.querySelector<HTMLButtonElement>("#restart-btn");
  const exportBtn = container.querySelector<HTMLButtonElement>("#export-btn");
  const exportIcon = container.querySelector<HTMLSpanElement>("#export-icon");

  if (
    !experimentGroup ||
    !aspectGroup ||
    !fileFormatGroup ||
    !playBtn ||
    !playIcon ||
    !playLabel ||
    !restartBtn ||
    !exportBtn ||
    !exportIcon
  ) {
    throw new Error("createControls: expected control elements were not found after render");
  }

  const pillButtons = [
    ...wirePillGroup(experimentGroup, callbacks.onExperimentChange),
    ...wirePillGroup(aspectGroup, callbacks.onAspectChange),
    ...wirePillGroup(fileFormatGroup, callbacks.onFileFormatChange),
  ];
  playBtn.addEventListener("click", () => callbacks.onPlayToggle());
  restartBtn.addEventListener("click", () => callbacks.onRestart());
  exportBtn.addEventListener("click", () => callbacks.onExport());

  return {
    setExportEnabled(enabled: boolean) {
      exportBtn.disabled = !enabled;
    },
    setExporting(exporting: boolean) {
      exportIcon.innerHTML = exporting
        ? uiIcon(ui.loader, "w-4 h-4 animate-spin")
        : uiIcon(ui.download);
    },
    setPlaying(playing: boolean) {
      playIcon.innerHTML = playing ? uiIcon(ui.pause) : uiIcon(ui.play);
      playLabel.textContent = playing ? "Pausar" : "Reproducir";
    },
    setPlaybackControlsEnabled(enabled: boolean) {
      playBtn.disabled = !enabled;
      restartBtn.disabled = !enabled;
      for (const button of pillButtons) button.disabled = !enabled;
    },
  };
}
