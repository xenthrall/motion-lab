export interface ControlOption {
  id: string;
  label: string;
}

export interface ControlsCallbacks {
  onExperimentChange: (id: string) => void;
  onAspectChange: (id: string) => void;
  onPlay: () => void;
  onRestart: () => void;
  onExport: () => void;
}

export interface Controls {
  setExportEnabled(enabled: boolean): void;
}

function renderOptions(options: ControlOption[]): string {
  return options.map((o) => `<option value="${o.id}">${o.label}</option>`).join("");
}

export function createControls(
  container: Element,
  experimentOptions: ControlOption[],
  aspectOptions: ControlOption[],
  callbacks: ControlsCallbacks,
): Controls {
  container.innerHTML = `
    <div class="controls">
      <label class="controls__field">
        Experimento
        <select id="experiment-select">${renderOptions(experimentOptions)}</select>
      </label>
      <label class="controls__field">
        Formato
        <select id="aspect-select">${renderOptions(aspectOptions)}</select>
      </label>
      <div class="controls__actions">
        <button id="play-btn" type="button">Reproducir</button>
        <button id="restart-btn" type="button">Reiniciar</button>
        <button id="export-btn" type="button">Descargar video</button>
      </div>
    </div>
  `;

  const experimentSelect = container.querySelector<HTMLSelectElement>("#experiment-select");
  const aspectSelect = container.querySelector<HTMLSelectElement>("#aspect-select");
  const playBtn = container.querySelector<HTMLButtonElement>("#play-btn");
  const restartBtn = container.querySelector<HTMLButtonElement>("#restart-btn");
  const exportBtn = container.querySelector<HTMLButtonElement>("#export-btn");

  if (!experimentSelect || !aspectSelect || !playBtn || !restartBtn || !exportBtn) {
    throw new Error("createControls: expected control elements were not found after render");
  }

  experimentSelect.addEventListener("change", () =>
    callbacks.onExperimentChange(experimentSelect.value),
  );
  aspectSelect.addEventListener("change", () => callbacks.onAspectChange(aspectSelect.value));
  playBtn.addEventListener("click", () => callbacks.onPlay());
  restartBtn.addEventListener("click", () => callbacks.onRestart());
  exportBtn.addEventListener("click", () => callbacks.onExport());

  return {
    setExportEnabled(enabled: boolean) {
      exportBtn.disabled = !enabled;
    },
  };
}
