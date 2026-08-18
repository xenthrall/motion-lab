import { createControls } from "@/components/controls";
import { createStage } from "@/components/stage";
import { createStatus } from "@/components/status";
import { createTimelineBar } from "@/components/timeline-bar";
import { experiments } from "@/experiments/registry";
import { ASPECT_PRESETS, DEFAULT_ASPECT_ID, getAspectPreset } from "@/export/aspect-presets";
import { type ExportFormat, recordSvgAnimation } from "@/export/capture";
import { downloadBlob } from "@/export/download";
import { DEFAULT_FILE_FORMAT, FILE_FORMATS, getFileFormat } from "@/export/file-formats";
import mascotSvg from "@/svg/mascot/tequia-base.svg?raw";
import { clearSceneProps } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * Lab entry point: mounts the mascot, lets you pick an experiment, an
 * aspect ratio and a file format, scrub/play/restart it live in the
 * browser like a video player, and export the current playback to a
 * downloadable file. No animation logic lives here — it only wires
 * together src/animations, src/experiments, src/export and
 * src/components.
 */
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("main: #app root not found");
}

app.innerHTML = `
  <div class="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
    <header class="text-center">
      <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">Tequia Motion Lab</h1>
      <p class="mt-1 text-sm text-neutral-400">Previsualizá y exportá animaciones de la mascota</p>
    </header>

    <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur sm:p-6">
      <div id="stage-container"></div>
      <div id="timeline-bar-container" class="mt-4"></div>
      <div id="controls-container" class="mt-6"></div>
    </div>

    <div id="status-container" class="flex justify-center"></div>
  </div>
`;

const stageContainer = app.querySelector<HTMLDivElement>("#stage-container");
const timelineBarContainer = app.querySelector<HTMLDivElement>("#timeline-bar-container");
const controlsContainer = app.querySelector<HTMLDivElement>("#controls-container");
const statusContainer = app.querySelector<HTMLDivElement>("#status-container");
if (!stageContainer || !timelineBarContainer || !controlsContainer || !statusContainer) {
  throw new Error("main: expected layout elements were not found");
}

const stage = createStage(stageContainer, mascotSvg);
const status = createStatus(statusContainer);

function resetVisualState(): void {
  // Some moves (e.g. entrance's gsap.from) render their starting values
  // immediately on creation — harmless once playback starts, but it means
  // a freshly created, not-yet-played timeline can leave the mascot stuck
  // looking invisible/mid-pose. Reset right after creating a timeline so
  // the idle preview always shows the mascot normally until Play is hit.
  gsap.set([stage.parts.mascot, stage.parts.eyes], { clearProps: "all" });
}

let currentAspectId = DEFAULT_ASPECT_ID;
let currentFileFormat: ExportFormat = DEFAULT_FILE_FORMAT;
let currentExperimentId = experiments[0].id;
let timeline = experiments[0].create(stage.parts);
let pendingResolve: (() => void) | null = null;

const timelineBar = createTimelineBar(timelineBarContainer, (seconds) => {
  timeline.pause(seconds);
  controls.setPlaying(false);
});

function wireTimeline(): void {
  resetVisualState();
  timeline.eventCallback("onUpdate", () => {
    timelineBar.setProgress(timeline.time());
  });
  timeline.eventCallback("onComplete", () => {
    controls.setPlaying(false);
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.();
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
  controls.setPlaying(false);
  wireTimeline();
}

/** Always plays the whole clip from the start — used by Restart and Export. */
function playFromStart(): Promise<void> {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    controls.setPlaying(true);
    timeline.restart();
  });
}

function togglePlayPause(): void {
  if (timeline.isActive() && !timeline.paused()) {
    timeline.pause();
    controls.setPlaying(false);
    return;
  }
  if (timeline.progress() >= 1) {
    void playFromStart();
    return;
  }
  controls.setPlaying(true);
  timeline.play();
}

const controls = createControls(
  controlsContainer,
  {
    experiments: experiments.map(({ id, label }) => ({ id, label })),
    aspects: ASPECT_PRESETS.map(({ id, label }) => ({ id, label })),
    fileFormats: FILE_FORMATS.map(({ id, label }) => ({ id, label })),
  },
  {
    onExperimentChange(id) {
      setExperiment(id);
      const label = experiments.find((experiment) => experiment.id === id)?.label ?? id;
      status.set(label, "idle");
    },
    onAspectChange(id) {
      currentAspectId = id;
      stage.setAspect(getAspectPreset(id));
    },
    onFileFormatChange(id) {
      currentFileFormat = id as ExportFormat;
    },
    onPlayToggle() {
      togglePlayPause();
    },
    onRestart() {
      void playFromStart();
    },
    async onExport() {
      const aspect = getAspectPreset(currentAspectId);
      const fileFormat = getFileFormat(currentFileFormat);
      controls.setExportEnabled(false);
      controls.setPlaybackControlsEnabled(false);
      timelineBar.setEnabled(false);
      controls.setExporting(true);
      status.set("Grabando…", "recording");
      try {
        const { blob, extension } = await recordSvgAnimation(stage.svg, playFromStart, {
          width: aspect.width,
          height: aspect.height,
          format: fileFormat.id,
        });
        downloadBlob(
          blob,
          `tequia-${currentExperimentId}-${aspect.id}-${fileFormat.id}.${extension}`,
        );
        status.set(`Exportado — ${aspect.label} · ${fileFormat.label}`, "success");
      } catch (error) {
        status.set(`Error al exportar: ${(error as Error).message}`, "error");
      } finally {
        controls.setExportEnabled(true);
        controls.setPlaybackControlsEnabled(true);
        timelineBar.setEnabled(true);
        controls.setExporting(false);
      }
    },
  },
);

wireTimeline();
status.set(`gsap ${gsap.version} · listo`, "idle");

if (import.meta.env.DEV) {
  (window as unknown as { __lab: unknown }).__lab = {
    gsap,
    stage,
    get timeline() {
      return timeline;
    },
  };
}
