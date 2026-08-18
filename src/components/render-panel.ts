import {
  DEFAULT_FPS,
  FPS_CHOICES,
  type RenderEvent,
  type RenderJob,
  type RenderLabels,
  type RenderOptionSummary,
  type RenderRequest,
  isActiveStatus,
} from "@/shared/render-api";
import { ui, uiIcon } from "./icons";
import { type RenderCard, createRenderCard } from "./render-card";

/**
 * The Renders view: queue something new, watch it render, then play,
 * download or delete the result — the whole offline-render workflow without
 * leaving the app.
 *
 * State is owned by the server and arrives over SSE; this component never
 * guesses what happened after an action, it just re-renders whatever the
 * next event says. That's what keeps two open tabs consistent.
 */

export interface RenderPanelOptions {
  experiments: RenderOptionSummary[];
  aspects: RenderOptionSummary[];
  backgrounds: RenderOptionSummary[];
}

export interface RenderPanelCallbacks {
  onQueue: (request: RenderRequest) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export interface RenderSelection {
  experimentId: string;
  aspectId: string;
  backgroundId: string;
}

export interface RenderPanel {
  applyEvent: (event: RenderEvent) => void;
  setJobs: (jobs: RenderJob[]) => void;
  setConnection: (state: { online: boolean; ffmpeg: boolean }) => void;
  /** Mirrors the Lab's current setup into the form, so "render what I'm
   * looking at" is the default rather than something to re-pick. */
  setSelection: (selection: RenderSelection) => void;
  getRequest: () => RenderRequest;
  activeCount: () => number;
}

const SELECT_CLASS =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink transition hover:border-brand-ring/40 focus:border-brand-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const FIELD_LABEL_CLASS =
  "mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-subtle";
const QUEUE_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-dark/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

function optionsHtml(items: RenderOptionSummary[]): string {
  return items.map((item) => `<option value="${item.id}">${item.label}</option>`).join("");
}

export function createRenderPanel(
  container: Element,
  options: RenderPanelOptions,
  callbacks: RenderPanelCallbacks,
): RenderPanel {
  container.innerHTML = `
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold tracking-tight text-ink">Renders</h2>
          <p class="text-xs text-ink-muted">
            Render offline, frame por frame — sin pérdida de frames por más pesada que sea la animación.
          </p>
        </div>
        <span id="connection-chip" class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"></span>
      </header>

      <form id="new-render-form" class="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label class="block">
            <span class="${FIELD_LABEL_CLASS}">Experimento</span>
            <select id="field-experiment" class="${SELECT_CLASS}">${optionsHtml(options.experiments)}</select>
          </label>
          <label class="block">
            <span class="${FIELD_LABEL_CLASS}">Aspecto</span>
            <select id="field-aspect" class="${SELECT_CLASS}">${optionsHtml(options.aspects)}</select>
          </label>
          <label class="block">
            <span class="${FIELD_LABEL_CLASS}">Fondo</span>
            <select id="field-background" class="${SELECT_CLASS}">${optionsHtml(options.backgrounds)}</select>
          </label>
          <label class="block">
            <span class="${FIELD_LABEL_CLASS}">FPS</span>
            <select id="field-fps" class="${SELECT_CLASS}">
              ${FPS_CHOICES.map(
                (fps) =>
                  `<option value="${fps}" ${fps === DEFAULT_FPS ? "selected" : ""}>${fps} fps</option>`,
              ).join("")}
            </select>
          </label>
        </div>
        <div class="flex items-center justify-end">
          <button type="submit" id="queue-btn" class="${QUEUE_BUTTON_CLASS}">
            ${uiIcon(ui.clapperboard)}
            <span>Encolar render</span>
          </button>
        </div>
      </form>

      <section id="active-section" class="hidden flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">En curso</h3>
        <div id="active-list" class="flex flex-col gap-2"></div>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Librería</h3>
        <!-- items-start: a short card (a cancelled render has no preview)
             must not stretch to the height of the tallest one in its row. -->
        <div id="library-list" class="grid grid-cols-1 items-start gap-3 lg:grid-cols-2"></div>
        <p id="library-empty" class="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          Todavía no hay renders. Encolá uno arriba.
        </p>
      </section>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>("#new-render-form");
  const experimentField = container.querySelector<HTMLSelectElement>("#field-experiment");
  const aspectField = container.querySelector<HTMLSelectElement>("#field-aspect");
  const backgroundField = container.querySelector<HTMLSelectElement>("#field-background");
  const fpsField = container.querySelector<HTMLSelectElement>("#field-fps");
  const queueBtn = container.querySelector<HTMLButtonElement>("#queue-btn");
  const connectionChip = container.querySelector<HTMLSpanElement>("#connection-chip");
  const activeSection = container.querySelector<HTMLElement>("#active-section");
  const activeList = container.querySelector<HTMLElement>("#active-list");
  const libraryList = container.querySelector<HTMLElement>("#library-list");
  const libraryEmpty = container.querySelector<HTMLElement>("#library-empty");
  if (
    !form ||
    !experimentField ||
    !aspectField ||
    !backgroundField ||
    !fpsField ||
    !queueBtn ||
    !connectionChip ||
    !activeSection ||
    !activeList ||
    !libraryList ||
    !libraryEmpty
  ) {
    throw new Error("createRenderPanel: expected elements were not found after render");
  }

  const jobs = new Map<string, RenderJob>();
  const cards = new Map<string, RenderCard>();

  const labelOf = (items: RenderOptionSummary[], id: string): string =>
    items.find((item) => item.id === id)?.label ?? id;

  /** The app knows every id's label locally, so a job doesn't have to wait
   * for the server to resolve them (a queued job would otherwise show raw
   * ids for as long as it sits in the queue). */
  const resolveLabels = (job: RenderJob): RenderLabels => ({
    experiment: labelOf(options.experiments, job.request.experimentId),
    aspect: labelOf(options.aspects, job.request.aspectId),
    background: labelOf(options.backgrounds, job.request.backgroundId),
  });

  const cardCallbacks = {
    onCancel: callbacks.onCancel,
    onDelete: callbacks.onDelete,
    resolveLabels,
  };

  const getRequest = (): RenderRequest => ({
    experimentId: experimentField.value,
    aspectId: aspectField.value,
    backgroundId: backgroundField.value,
    fps: Number(fpsField.value),
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    callbacks.onQueue(getRequest());
  });

  /**
   * Moves each card into place only when it isn't already there, so a
   * progress tick never re-inserts a <video> element (which would restart
   * playback) and never fights the user's scroll position.
   */
  const reconcile = (host: HTMLElement, list: RenderJob[]): void => {
    let previous: Element | null = null;
    for (const job of list) {
      let card = cards.get(job.id);
      if (!card) {
        card = createRenderCard(job, cardCallbacks);
        cards.set(job.id, card);
      } else {
        card.update(job);
      }
      const expected: Element | null = previous
        ? previous.nextElementSibling
        : host.firstElementChild;
      if (expected !== card.element) host.insertBefore(card.element, expected);
      previous = card.element;
    }
  };

  const render = (): void => {
    const all = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const active = all.filter((job) => isActiveStatus(job.status));
    const library = all.filter((job) => !isActiveStatus(job.status));

    for (const [id, card] of cards) {
      if (!jobs.has(id)) {
        card.element.remove();
        cards.delete(id);
      }
    }

    reconcile(activeList, active);
    reconcile(libraryList, library);

    activeSection.classList.toggle("hidden", active.length === 0);
    activeSection.classList.toggle("flex", active.length > 0);
    libraryEmpty.classList.toggle("hidden", library.length > 0);
  };

  const setJobs = (list: RenderJob[]): void => {
    jobs.clear();
    for (const job of list) jobs.set(job.id, job);
    render();
  };

  return {
    setJobs,

    applyEvent(event: RenderEvent) {
      if (event.type === "snapshot") {
        setJobs(event.jobs);
        return;
      }
      if (event.type === "removed") {
        jobs.delete(event.id);
      } else {
        jobs.set(event.job.id, event.job);
      }
      render();
    },

    setConnection({ online, ffmpeg }) {
      const state = !online
        ? {
            text: "API no disponible",
            className: "bg-red-500/15 text-red-500",
            icon: ui.server,
            disable: true,
          }
        : !ffmpeg
          ? {
              text: "Falta ffmpeg",
              className: "bg-amber-500/15 text-amber-500",
              icon: ui.alert,
              disable: true,
            }
          : {
              text: "API conectada",
              className: "bg-emerald-500/15 text-emerald-500",
              icon: ui.check,
              disable: false,
            };
      connectionChip.className = `inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${state.className}`;
      connectionChip.innerHTML = `${uiIcon(state.icon, "w-3.5 h-3.5")}${state.text}`;
      queueBtn.disabled = state.disable;
      queueBtn.title = !online
        ? "Iniciá el backend con `npm run dev` para renderizar"
        : !ffmpeg
          ? "Instalá ffmpeg en el sistema para poder codificar el video"
          : "";
    },

    setSelection({ experimentId, aspectId, backgroundId }) {
      experimentField.value = experimentId;
      aspectField.value = aspectId;
      backgroundField.value = backgroundId;
    },

    getRequest,

    activeCount() {
      return [...jobs.values()].filter((job) => isActiveStatus(job.status)).length;
    },
  };
}
