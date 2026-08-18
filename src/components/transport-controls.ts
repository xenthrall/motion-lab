import { ui, uiIcon } from "./icons";

export interface TransportCallbacks {
  onPlayToggle: () => void;
  onRestart: () => void;
  onLoopToggle: () => void;
}

export interface TransportControls {
  setPlaying(playing: boolean): void;
  setLooping(looping: boolean): void;
  setEnabled(enabled: boolean): void;
}

const ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition hover:border-brand-ring/40 hover:text-ink aria-pressed:border-brand-ring/50 aria-pressed:bg-brand/15 aria-pressed:text-brand disabled:cursor-not-allowed disabled:opacity-40";

const PLAY_BUTTON_CLASS =
  "inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand-dark/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

/** Restart | Play/Pause | Loop — the transport row directly under the stage. */
export function createTransportControls(
  container: Element,
  callbacks: TransportCallbacks,
): TransportControls {
  container.innerHTML = `
    <div class="flex items-center justify-center gap-3">
      <button id="restart-btn" type="button" class="${ICON_BUTTON_CLASS}" title="Reiniciar" aria-label="Reiniciar">
        ${uiIcon(ui.restart)}
      </button>
      <button id="play-btn" type="button" class="${PLAY_BUTTON_CLASS}" aria-label="Reproducir">
        <span id="play-icon" class="inline-flex">${uiIcon(ui.play, "w-5 h-5")}</span>
      </button>
      <button
        id="loop-btn"
        type="button"
        class="${ICON_BUTTON_CLASS}"
        title="Repetir en bucle"
        aria-label="Repetir en bucle"
        aria-pressed="true"
      >
        ${uiIcon(ui.repeat)}
      </button>
    </div>
  `;

  const restartBtn = container.querySelector<HTMLButtonElement>("#restart-btn");
  const playBtn = container.querySelector<HTMLButtonElement>("#play-btn");
  const playIcon = container.querySelector<HTMLSpanElement>("#play-icon");
  const loopBtn = container.querySelector<HTMLButtonElement>("#loop-btn");
  if (!restartBtn || !playBtn || !playIcon || !loopBtn) {
    throw new Error("createTransportControls: expected elements were not found after render");
  }

  restartBtn.addEventListener("click", () => callbacks.onRestart());
  playBtn.addEventListener("click", () => callbacks.onPlayToggle());
  loopBtn.addEventListener("click", () => callbacks.onLoopToggle());

  return {
    setPlaying(playing: boolean) {
      playIcon.innerHTML = playing ? uiIcon(ui.pause, "w-5 h-5") : uiIcon(ui.play, "w-5 h-5");
      playBtn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
    },
    setLooping(looping: boolean) {
      loopBtn.setAttribute("aria-pressed", String(looping));
    },
    setEnabled(enabled: boolean) {
      restartBtn.disabled = !enabled;
      playBtn.disabled = !enabled;
      loopBtn.disabled = !enabled;
    },
  };
}
