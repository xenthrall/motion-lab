import { renderApi } from "@/api/render-client";
import {
  type RenderJob,
  type RenderLabels,
  type RenderStatus,
  isActiveStatus,
  jobProgress,
} from "@/shared/render-api";
import { ui, uiIcon } from "./icons";

export interface RenderCardCallbacks {
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  /** The app knows the human labels for every id locally, so a job that the
   * server hasn't resolved yet (still queued) still shows real names. */
  resolveLabels: (job: RenderJob) => RenderLabels;
}

export interface RenderCard {
  element: HTMLElement;
  update: (job: RenderJob) => void;
}

const CARD_CLASS = "flex flex-col gap-3 rounded-xl border border-line bg-surface p-3";
const CHIP_CLASS =
  "inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted";
const ACTION_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink transition hover:border-brand-ring/40 hover:bg-brand/5";

// Same checkerboard as the stage and the transparency swatch — a transparent
// render on a solid card would look like a black video and read as broken.
const CHECKERBOARD =
  "background-image:conic-gradient(#8b8b8b 90deg,transparent 90deg 180deg,#8b8b8b 180deg 270deg,transparent 270deg);background-size:16px 16px;";

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} kB`;
}

function statusChip(job: RenderJob): string {
  const map: Record<RenderStatus, { text: string; className: string; icon: string }> = {
    queued: { text: "En cola", className: "bg-surface-muted text-ink-muted", icon: ui.film },
    running: { text: "Renderizando", className: "bg-brand/15 text-brand", icon: ui.loader },
    done: { text: "Listo", className: "bg-emerald-500/15 text-emerald-500", icon: ui.check },
    failed: { text: "Falló", className: "bg-red-500/15 text-red-500", icon: ui.alert },
    cancelled: { text: "Cancelado", className: "bg-surface-muted text-ink-subtle", icon: ui.close },
  };
  const chip = map[job.status];
  const spin = job.status === "running" ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5";
  return `<span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${chip.className}">
    ${uiIcon(chip.icon, spin)}${chip.text}
  </span>`;
}

function stageText(job: RenderJob): string {
  if (job.status === "queued") return "Esperando su turno…";
  if (job.stage === "starting") return "Preparando el navegador…";
  if (job.stage === "encoding") return "Codificando con ffmpeg…";
  if (job.stage === "frames") return `Frame ${job.framesDone} / ${job.framesTotal}`;
  return "";
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
  );
}

/**
 * One render in the manager: a progress card while it runs, a playable video
 * with download/delete once it lands, an error message if it failed.
 *
 * The inner markup is rebuilt only when the *status* changes, never on a
 * progress tick — otherwise the frame counter (which updates several times a
 * second) would keep recreating the <video> element and restart playback
 * under the user's cursor.
 */
export function createRenderCard(job: RenderJob, callbacks: RenderCardCallbacks): RenderCard {
  const element = document.createElement("article");
  element.className = CARD_CLASS;

  let builtStatus: RenderStatus | null = null;
  let progressFill: HTMLElement | null = null;
  let progressLabel: HTMLElement | null = null;

  const build = (current: RenderJob): void => {
    const labels = callbacks.resolveLabels(current);
    const { request, output } = current;

    const meta = [
      labels.aspect,
      labels.background,
      `${request.fps} fps`,
      output ? `${output.width}×${output.height}` : null,
      output ? `${output.durationSeconds.toFixed(1)} s` : null,
      output ? formatBytes(output.bytes) : null,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => `<span class="${CHIP_CLASS}">${escapeHtml(value)}</span>`)
      .join("");

    const preview =
      current.status === "done" && output
        ? `<div class="overflow-hidden rounded-lg border border-line ${
            output.transparent ? "" : "bg-black/80"
          }" ${output.transparent ? `style="${CHECKERBOARD}"` : ""}>
             <video
               class="block max-h-64 w-full bg-transparent object-contain"
               src="${renderApi.fileUrl(current.id)}"
               controls loop muted playsinline preload="metadata"
             ></video>
           </div>`
        : "";

    const progress = isActiveStatus(current.status)
      ? `<div class="flex flex-col gap-1.5">
           <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
             <div data-progress-fill class="h-full rounded-full bg-brand transition-[width] duration-200" style="width:0%"></div>
           </div>
           <span data-progress-label class="text-[11px] text-ink-muted"></span>
         </div>`
      : "";

    const error =
      current.status === "failed" && current.error
        ? `<p class="whitespace-pre-wrap break-words rounded-lg bg-red-500/10 p-2 text-[11px] text-red-500">${escapeHtml(
            current.error,
          )}</p>`
        : "";

    const actions = isActiveStatus(current.status)
      ? `<button type="button" data-action="cancel" class="${ACTION_CLASS}">${uiIcon(ui.close, "w-3.5 h-3.5")}Cancelar</button>`
      : `${
          current.status === "done"
            ? `<a href="${renderApi.fileUrl(current.id, { download: true })}" class="${ACTION_CLASS}">${uiIcon(
                ui.download,
                "w-3.5 h-3.5",
              )}Descargar</a>`
            : ""
        }
         <button type="button" data-action="delete" class="${ACTION_CLASS} hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-500">${uiIcon(
           ui.trash,
           "w-3.5 h-3.5",
         )}Borrar</button>`;

    element.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-sm font-semibold leading-tight text-ink">${escapeHtml(labels.experiment)}</h4>
        ${statusChip(current)}
      </div>
      <div class="flex flex-wrap gap-1">${meta}</div>
      ${preview}
      ${progress}
      ${error}
      <div class="flex flex-wrap items-center gap-2">${actions}</div>
    `;

    progressFill = element.querySelector<HTMLElement>("[data-progress-fill]");
    progressLabel = element.querySelector<HTMLElement>("[data-progress-label]");

    element
      .querySelector<HTMLButtonElement>('[data-action="cancel"]')
      ?.addEventListener("click", () => callbacks.onCancel(current.id));
    element
      .querySelector<HTMLButtonElement>('[data-action="delete"]')
      ?.addEventListener("click", () => callbacks.onDelete(current.id));
  };

  const update = (current: RenderJob): void => {
    if (current.status !== builtStatus) {
      build(current);
      builtStatus = current.status;
    }
    if (progressFill) progressFill.style.width = `${Math.round(jobProgress(current) * 100)}%`;
    if (progressLabel) progressLabel.textContent = stageText(current);
  };

  update(job);
  return { element, update };
}
