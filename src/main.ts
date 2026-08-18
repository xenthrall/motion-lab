import { renderApi, subscribeToRenderEvents } from "@/api/render-client";
import { ASPECT_ICONS } from "@/components/format-icons";
import { brandIcon, colorSwatch, transparencySwatch, ui, uiIcon } from "@/components/icons";
import { createRenderPanel } from "@/components/render-panel";
import { type LabView, createSidebar } from "@/components/sidebar";
import { createStage } from "@/components/stage";
import { createStatus } from "@/components/status";
import { type Theme, applyTheme, getInitialTheme } from "@/components/theme";
import { createTimelineBar } from "@/components/timeline-bar";
import { createToolbar } from "@/components/toolbar";
import { createTransportControls } from "@/components/transport-controls";
import { experiments } from "@/experiments/registry";
import { ASPECT_PRESETS, DEFAULT_ASPECT_ID, getAspectPreset } from "@/export/aspect-presets";
import { BACKGROUNDS, DEFAULT_BACKGROUND_ID, getBackground } from "@/export/backgrounds";
import { recordSvgAnimation } from "@/export/capture";
import { downloadBlob } from "@/export/download";
import type { RenderRequest } from "@/shared/render-api";
import { accessories } from "@/svg/mascot/accessories";
import { expressions } from "@/svg/mascot/expressions";
import mascotSvg from "@/svg/mascot/tequia-base.svg?raw";
import { clearSceneProps } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * Lab entry point — an admin-panel-style layout: a sidebar for browsing
 * experiments (a gallery, selecting one plays it looping immediately) and
 * app-level settings (theme), and a center panel that's just the preview
 * (stage + timeline scrubber + transport controls) with a compact toolbar
 * for aspect ratio / background (each opens a small popover) and export.
 * No animation logic lives here — it only wires together src/animations,
 * src/experiments, src/export and src/components.
 */
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("main: #app root not found");
}

app.innerHTML = `
  <div class="flex min-h-screen flex-col md:h-screen md:flex-row">
    <aside
      id="sidebar-container"
      class="w-full border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r"
    ></aside>
    <!-- The lab column is a full-height flex chain (min-h-0 at every level,
         or a flex child refuses to shrink below its content) so the stage
         can claim every pixel the toolbar and transport don't need. -->
    <main class="flex flex-1 flex-col px-4 py-5 sm:px-8 sm:py-6 md:min-h-0 md:overflow-y-auto">
      <div id="lab-view" class="flex flex-1 flex-col items-center gap-4 md:min-h-0">
        <!-- Anchos más generosos que el stage anterior: con el marco grande,
             una barra de 28rem se veía apretada y el toolbar se partía en
             dos filas. -->
        <div id="toolbar-container" class="w-full max-w-2xl"></div>
        <div
          id="stage-container"
          class="flex min-h-[45vh] w-full flex-1 items-center justify-center md:min-h-0"
        ></div>
        <div id="timeline-bar-container" class="w-full max-w-xl"></div>
        <div id="transport-container"></div>
        <div id="status-container"></div>
      </div>
      <div id="renders-view" class="hidden"></div>
    </main>
  </div>
`;

const sidebarContainer = app.querySelector<HTMLDivElement>("#sidebar-container");
const toolbarContainer = app.querySelector<HTMLDivElement>("#toolbar-container");
const stageContainer = app.querySelector<HTMLDivElement>("#stage-container");
const timelineBarContainer = app.querySelector<HTMLDivElement>("#timeline-bar-container");
const transportContainer = app.querySelector<HTMLDivElement>("#transport-container");
const statusContainer = app.querySelector<HTMLDivElement>("#status-container");
const labView = app.querySelector<HTMLDivElement>("#lab-view");
const rendersView = app.querySelector<HTMLDivElement>("#renders-view");
if (
  !sidebarContainer ||
  !toolbarContainer ||
  !stageContainer ||
  !timelineBarContainer ||
  !transportContainer ||
  !statusContainer ||
  !labView ||
  !rendersView
) {
  throw new Error("main: expected layout elements were not found");
}

let currentTheme: Theme = getInitialTheme();
applyTheme(currentTheme);

const stage = createStage(stageContainer, mascotSvg);
const status = createStatus(statusContainer);
const timelineBar = createTimelineBar(timelineBarContainer, (seconds) => {
  // .pause(seconds) suppresses events by default, which silently skips any
  // tl.call()s between the old and new position (e.g. setExpression) —
  // found by scrubbing mascot-adventure and landing on the wrong face.
  // .time(seconds, false) seeks with events un-suppressed instead.
  timeline.pause();
  timeline.time(seconds, false);
  transport.setPlaying(false);
});

function resetVisualState(): void {
  // Some moves (e.g. entrance's gsap.from) render their starting values
  // immediately on creation — harmless once playback starts, but it means
  // a freshly created, not-yet-played timeline can leave the mascot stuck
  // looking invisible/mid-pose for an instant. Reset right after creating
  // a timeline so nothing weird flashes before playback kicks in.
  gsap.set([stage.parts.mascot, stage.parts.eyes, stage.parts.extra], { clearProps: "all" });
  // setExpression/setAccessory swap EYES/MOUTH/EXTRA innerHTML directly —
  // GSAP has no notion of an "end state" to rewind for that, so without
  // this, restarting (or looping) an experiment that changes expression
  // would start every replay still wearing whatever face it ended on (e.g.
  // mascot-adventure looping back in still smiling from its "happy"
  // ending), and mascot-rescue would loop back in still wearing the hero
  // shades it just dropped.
  stage.parts.eyes.innerHTML = expressions.neutral.eyes;
  stage.parts.mouth.innerHTML = expressions.neutral.mouth;
  stage.parts.extra.innerHTML = accessories.none.markup;
}

let currentAspectId = DEFAULT_ASPECT_ID;
let currentBackgroundId = DEFAULT_BACKGROUND_ID;
let currentExperimentId = experiments[0].id;
let timeline = experiments[0].create(stage.parts);
let pendingResolve: (() => void) | null = null;
let loopEnabled = true;
let isExporting = false;

function wireTimeline(): void {
  resetVisualState();
  timeline.eventCallback("onUpdate", () => {
    timelineBar.setProgress(timeline.time());
  });
  timeline.eventCallback("onComplete", () => {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.();
    if (loopEnabled && !isExporting) {
      resetVisualState();
      timeline.restart();
      return;
    }
    transport.setPlaying(false);
  });
  timelineBar.setDuration(timeline.duration());
  timelineBar.setProgress(0);
}

function setExperiment(id: string): void {
  const definition = experiments.find((experiment) => experiment.id === id) ?? experiments[0];
  timeline.kill();
  clearSceneProps(stage.parts.root);
  currentExperimentId = definition.id;
  timeline = definition.create(stage.parts);
  wireTimeline();
  syncRenderForm();
  void playFromStart();
}

/** Always plays the whole clip from the start — used by Restart, Export, and picking a new experiment. */
function playFromStart(): Promise<void> {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    resetVisualState();
    transport.setPlaying(true);
    timeline.restart();
  });
}

function togglePlayPause(): void {
  if (timeline.isActive() && !timeline.paused()) {
    timeline.pause();
    transport.setPlaying(false);
    return;
  }
  if (timeline.progress() >= 1) {
    void playFromStart();
    return;
  }
  transport.setPlaying(true);
  timeline.play();
}

const sidebar = createSidebar(
  sidebarContainer,
  experiments.map(({ id, label, description }) => ({ id, label, description })),
  {
    onExperimentSelect(id) {
      setExperiment(id);
      const label = experiments.find((experiment) => experiment.id === id)?.label ?? id;
      status.set(label, "idle");
      // Picking an experiment is a "show me this animation" gesture, so it
      // also brings the preview back into view from the Renders panel.
      setView("lab");
    },
    onThemeToggle() {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(currentTheme);
      sidebar.setTheme(currentTheme);
    },
    onViewChange(view) {
      setView(view);
    },
  },
);
sidebar.setTheme(currentTheme);

/** Swaps the main panel between the animation lab and the render manager.
 * An arrow function rather than a `function` declaration on purpose: a
 * hoisted declaration would lose the non-null narrowing the layout check
 * above established on the view containers. */
const setView = (view: LabView): void => {
  labView.classList.toggle("hidden", view !== "lab");
  labView.classList.toggle("flex", view === "lab");
  rendersView.classList.toggle("hidden", view !== "renders");
  sidebar.setView(view);
};

const aspectItems = ASPECT_PRESETS.map((preset) => {
  const icons = ASPECT_ICONS[preset.id];
  const shape = uiIcon(icons?.shape ?? ui.square, "w-4 h-4");
  const mark = icons ? brandIcon(icons.brand, "w-3 h-3 opacity-60") : "";
  return {
    id: preset.id,
    label: preset.label,
    iconHtml: `<span class="inline-flex items-center gap-1">${shape}${mark}</span>`,
  };
});

const backgroundItems = BACKGROUNDS.map((background) => ({
  id: background.id,
  label: background.label,
  iconHtml:
    background.kind === "transparent"
      ? transparencySwatch()
      : colorSwatch(background.color ?? "#000"),
}));

const toolbar = createToolbar(toolbarContainer, aspectItems, backgroundItems, {
  onAspectChange(id) {
    currentAspectId = id;
    stage.setAspect(getAspectPreset(id));
    // Changing the format changes the viewBox, and experiments read it when
    // they build (to start a projectile just off-screen, for instance), so
    // the timeline has to be rebuilt against the new frame. Rebuilding
    // restarts playback, which is also the quickest way to see the new
    // framing.
    setExperiment(currentExperimentId);
    syncRenderForm();
  },
  onBackgroundChange(id) {
    currentBackgroundId = id;
    stage.setBackground(getBackground(id));
    syncRenderForm();
  },
  onRender() {
    // "Render what I'm looking at": the Lab's current setup, at whatever fps
    // the Renders form is set to.
    void queueRender({
      experimentId: currentExperimentId,
      aspectId: currentAspectId,
      backgroundId: currentBackgroundId,
      fps: renderPanel.getRequest().fps,
    });
    setView("renders");
  },
  async onExport() {
    const aspect = getAspectPreset(currentAspectId);
    const background = getBackground(currentBackgroundId);
    isExporting = true;
    toolbar.setExportEnabled(false);
    toolbar.setPickersEnabled(false);
    toolbar.setExporting(true);
    transport.setEnabled(false);
    timelineBar.setEnabled(false);
    sidebar.gallery.setEnabled(false);
    status.set("Grabando…", "recording");
    try {
      const { blob, extension } = await recordSvgAnimation(stage.svg, playFromStart, {
        width: aspect.width,
        height: aspect.height,
        format: background.kind === "transparent" ? "webm-transparent" : "mp4",
        backgroundColor: background.color,
      });
      downloadBlob(
        blob,
        `tequia-${currentExperimentId}-${aspect.id}-${background.id}.${extension}`,
      );
      status.set(`Exportado — ${aspect.label} · ${background.label}`, "success");
    } catch (error) {
      status.set(`Error al exportar: ${(error as Error).message}`, "error");
    } finally {
      isExporting = false;
      toolbar.setExportEnabled(true);
      toolbar.setPickersEnabled(true);
      toolbar.setExporting(false);
      transport.setEnabled(true);
      timelineBar.setEnabled(true);
      sidebar.gallery.setEnabled(true);
    }
  },
});

const transport = createTransportControls(transportContainer, {
  onPlayToggle() {
    togglePlayPause();
  },
  onRestart() {
    void playFromStart();
  },
  onLoopToggle() {
    loopEnabled = !loopEnabled;
    transport.setLooping(loopEnabled);
  },
});

// --- Render manager (offline renders, handled by the Node backend) --------

const renderPanel = createRenderPanel(
  rendersView,
  {
    experiments: experiments.map(({ id, label, description }) => ({
      id,
      label,
      hint: description,
    })),
    aspects: ASPECT_PRESETS.map(({ id, label }) => ({ id, label })),
    backgrounds: BACKGROUNDS.map(({ id, label }) => ({ id, label })),
  },
  {
    onQueue(request) {
      void queueRender(request);
    },
    onCancel(id) {
      void renderApi.cancel(id).catch((error: Error) => {
        status.set(`No se pudo cancelar: ${error.message}`, "error");
      });
    },
    onDelete(id) {
      void renderApi.remove(id).catch((error: Error) => {
        status.set(`No se pudo borrar: ${error.message}`, "error");
      });
    },
  },
);

/** Keeps the "new render" form showing whatever the Lab is currently
 * previewing, so queueing a render of it is one click with nothing to re-pick. */
function syncRenderForm(): void {
  renderPanel.setSelection({
    experimentId: currentExperimentId,
    aspectId: currentAspectId,
    backgroundId: currentBackgroundId,
  });
}

let backendOnline = false;
let ffmpegAvailable = false;

function reflectBackendState(): void {
  renderPanel.setConnection({ online: backendOnline, ffmpeg: ffmpegAvailable });
  toolbar.setRenderEnabled(
    backendOnline && ffmpegAvailable,
    backendOnline
      ? "Falta ffmpeg en el sistema — instalalo para poder renderizar"
      : "El backend de render no está disponible (arrancá con `npm run dev`)",
  );
}

async function refreshHealth(): Promise<void> {
  try {
    const health = await renderApi.health();
    backendOnline = health.ok;
    ffmpegAvailable = health.ffmpeg;
  } catch {
    // Expected when only Vite is running (`npm run dev:app`): the panel says
    // so and disables queueing instead of failing on the first click.
    backendOnline = false;
    ffmpegAvailable = false;
  }
  reflectBackendState();
}

async function queueRender(request: RenderRequest): Promise<void> {
  try {
    await renderApi.create(request);
    status.set("Render encolado", "idle");
  } catch (error) {
    status.set(`No se pudo encolar el render: ${(error as Error).message}`, "error");
  }
}

subscribeToRenderEvents({
  onEvent(event) {
    renderPanel.applyEvent(event);
    sidebar.setRenderBadge(renderPanel.activeCount());
  },
  onConnectionChange(online) {
    const wasOffline = !backendOnline;
    backendOnline = online;
    // Coming back online is also the moment to re-check ffmpeg — the server
    // may have been restarted with a different environment.
    if (online && wasOffline) void refreshHealth();
    else reflectBackendState();
  },
});

void refreshHealth();
syncRenderForm();
setView("lab");

wireTimeline();
status.set(`gsap ${gsap.version} · listo`, "idle");
void playFromStart();

if (import.meta.env.DEV) {
  (window as unknown as { __lab: unknown }).__lab = {
    gsap,
    stage,
    get timeline() {
      return timeline;
    },
  };
}
