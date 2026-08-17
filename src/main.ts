import { createControls } from "@/components/controls";
import { createStage } from "@/components/stage";
import { experiments } from "@/experiments/registry";
import { ASPECT_PRESETS, DEFAULT_ASPECT_ID, getAspectPreset } from "@/export/aspect-presets";
import { recordSvgAnimation } from "@/export/capture";
import { downloadBlob } from "@/export/download";
import mascotSvg from "@/svg/mascot/tequia-base.svg?raw";
import gsap from "gsap";

/**
 * Lab entry point: mounts the mascot, lets you pick an experiment and a
 * social aspect ratio, play/restart it live in the browser, and export the
 * current playback to a downloadable video. No animation logic lives here
 * — it only wires together src/animations, src/experiments, src/export
 * and src/components.
 */
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("main: #app root not found");
}

app.innerHTML = `
  <h1>Tequia Motion Lab</h1>
  <div id="stage-container"></div>
  <div id="controls-container"></div>
  <p class="status" id="status-line">gsap ${gsap.version}</p>
`;

const stageContainer = app.querySelector<HTMLDivElement>("#stage-container");
const controlsContainer = app.querySelector<HTMLDivElement>("#controls-container");
const statusLine = app.querySelector<HTMLParagraphElement>("#status-line");
if (!stageContainer || !controlsContainer || !statusLine) {
  throw new Error("main: expected layout elements were not found");
}

const stage = createStage(stageContainer, mascotSvg);

let currentAspectId = DEFAULT_ASPECT_ID;
let currentExperimentId = experiments[0].id;
let timeline = experiments[0].create(stage.parts);

function setExperiment(id: string): void {
  const definition = experiments.find((experiment) => experiment.id === id) ?? experiments[0];
  timeline.kill();
  gsap.set([stage.parts.mascot, stage.parts.eyes], { clearProps: "all" });
  currentExperimentId = definition.id;
  timeline = definition.create(stage.parts);
}

function playCurrent(): Promise<void> {
  return new Promise((resolve) => {
    timeline.eventCallback("onComplete", () => resolve());
    timeline.restart();
  });
}

const controls = createControls(
  controlsContainer,
  experiments.map(({ id, label }) => ({ id, label })),
  ASPECT_PRESETS.map(({ id, label }) => ({ id, label })),
  {
    onExperimentChange(id) {
      setExperiment(id);
      statusLine.textContent = `experimento: ${currentExperimentId}`;
    },
    onAspectChange(id) {
      currentAspectId = id;
      stage.setAspect(getAspectPreset(id));
    },
    onPlay() {
      void playCurrent();
    },
    onRestart() {
      timeline.pause(0);
      void playCurrent();
    },
    async onExport() {
      const preset = getAspectPreset(currentAspectId);
      controls.setExportEnabled(false);
      statusLine.textContent = "grabando…";
      try {
        const { blob, extension } = await recordSvgAnimation(stage.svg, playCurrent, {
          width: preset.width,
          height: preset.height,
        });
        downloadBlob(blob, `tequia-${currentExperimentId}-${preset.id}.${extension}`);
        statusLine.textContent = `exportado (${preset.label}, .${extension})`;
      } catch (error) {
        statusLine.textContent = `error al exportar: ${(error as Error).message}`;
      } finally {
        controls.setExportEnabled(true);
      }
    },
  },
);

statusLine.textContent = `gsap ${gsap.version} · experimento: ${currentExperimentId}`;

if (import.meta.env.DEV) {
  (window as unknown as { __lab: unknown }).__lab = {
    gsap,
    stage,
    get timeline() {
      return timeline;
    },
  };
}
