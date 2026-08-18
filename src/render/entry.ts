import { experiments } from "@/experiments/registry";
import { ASPECT_PRESETS, getAspectPreset } from "@/export/aspect-presets";
import { BACKGROUNDS, getBackground } from "@/export/backgrounds";
import { rasterizeSvgToCanvas } from "@/export/rasterize";
import type { RenderPageApi, RenderPlan, RenderRequest } from "@/shared/render-api";
import { expressions } from "@/svg/mascot/expressions";
import mascotSvg from "@/svg/mascot/tequia-base.svg?raw";
import { mountInlineSvg } from "@/svg/utils/inline-svg";
import { queryMascotParts } from "@/svg/utils/query-mascot";
import { clearSceneProps } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * The headless render page (`/render.html`) — a second entry point that
 * exists purely to be driven by a robot.
 *
 * It mounts the mascot and the same experiment timelines as the lab, but
 * *no UI at all*: no sidebar, no toolbar, no transport, no theme, no
 * Tailwind. Playwright loads this page (from `server/render/engine.ts` or
 * the CLI), calls `configure()`, then alternates `seek()` / `captureFrame()`
 * for every frame.
 *
 * Why a separate page instead of the previous dev-only `window.__lab` hook
 * on the main app:
 *
 *  - **It exists in production builds.** The old hook was stripped by
 *    `import.meta.env.DEV`, so the backend could only ever render against a
 *    Vite dev server. This page is a real Rollup input (see vite.config.ts).
 *  - **It's a contract, not a debug hook.** Renders no longer break when a
 *    lab component is renamed or restructured; the only coupling left is
 *    the `RenderPageApi` interface in src/shared/render-api.ts.
 *  - **It loads faster in the headless browser**, because there is no lab
 *    UI to build before the first frame can be drawn.
 *
 * What it deliberately still shares with the lab: the experiment registry,
 * the aspect/background presets, and `rasterizeSvgToCanvas`. Those are the
 * things that must stay identical or a render would stop matching the
 * preview.
 */

const root = document.querySelector<HTMLDivElement>("#render-root");
if (!root) {
  throw new Error("render/entry: #render-root not found");
}

const svg = mountInlineSvg(root, mascotSvg);
const parts = queryMascotParts(svg);

// One canvas reused for every frame — the render loop can run thousands of
// times, and there's no reason to reallocate a 1080x1920 backing store per
// frame. `alpha: true` is the default but stated explicitly because the
// transparent-background path depends on it (see src/export/README.md).
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
if (!ctx) {
  throw new Error("render/entry: could not get a 2d canvas context");
}

let timeline: gsap.core.Timeline | null = null;
let plan: RenderPlan | null = null;

/** Mirrors `resetVisualState()` in src/main.ts — see the note there on why
 * the raw innerHTML swap of setExpression needs an explicit reset. Without
 * it, two renders in a row on the same page would start with whatever face
 * the previous one ended on. */
function resetVisualState(): void {
  gsap.set([parts.mascot, parts.eyes], { clearProps: "all" });
  parts.eyes.innerHTML = expressions.neutral.eyes;
  parts.mouth.innerHTML = expressions.neutral.mouth;
}

function findOrThrow<T extends { id: string }>(items: T[], id: string, kind: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) {
    const available = items.map((item) => item.id).join(", ");
    throw new Error(`Unknown ${kind} "${id}". Available: ${available}`);
  }
  return found;
}

const api: RenderPageApi = {
  listOptions() {
    return {
      experiments: experiments.map(({ id, label, description }) => ({
        id,
        label,
        hint: description,
      })),
      aspects: ASPECT_PRESETS.map(({ id, label, width, height }) => ({
        id,
        label,
        hint: `${width}x${height}`,
      })),
      backgrounds: BACKGROUNDS.map(({ id, label, kind, color }) => ({
        id,
        label,
        hint: kind === "transparent" ? "canal alfa" : (color ?? ""),
      })),
    };
  },

  configure(request: RenderRequest): RenderPlan {
    // Validated here rather than on the server on purpose: this page owns
    // the registries, so an unknown id can never silently render the wrong
    // thing (getAspectPreset/getBackground both fall back to the first
    // entry, which would be a confusing success instead of a clear error).
    const experiment = findOrThrow(experiments, request.experimentId, "experiment");
    findOrThrow(ASPECT_PRESETS, request.aspectId, "aspect");
    findOrThrow(BACKGROUNDS, request.backgroundId, "background");

    const aspect = getAspectPreset(request.aspectId);
    const background = getBackground(request.backgroundId);

    timeline?.kill();
    clearSceneProps(parts.root);
    resetVisualState();

    // Timelines auto-play on creation; freeze immediately, the engine drives
    // time by hand from here on.
    timeline = experiment.create(parts);
    timeline.pause();
    timeline.time(0, false);

    canvas.width = aspect.width;
    canvas.height = aspect.height;

    plan = {
      width: aspect.width,
      height: aspect.height,
      transparent: background.kind === "transparent",
      backgroundColor: background.color ?? "#000000",
      durationSeconds: timeline.duration(),
      labels: {
        experiment: experiment.label,
        aspect: aspect.label,
        background: background.label,
      },
    };
    return plan;
  },

  seek(seconds: number): void {
    if (!timeline) {
      throw new Error("render/entry: seek() called before configure()");
    }
    // .pause(t) suppresses events, which silently skips the tl.call()s that
    // drive expression changes. .time(t, false) seeks with events live —
    // the same fix the lab's scrubber uses (src/animations/README.md).
    timeline.pause();
    timeline.time(seconds, false);
  },

  async captureFrame(): Promise<string> {
    if (!plan) {
      throw new Error("render/entry: captureFrame() called before configure()");
    }
    await rasterizeSvgToCanvas(svg, ctx, plan);
    return canvas.toDataURL("image/png");
  },
};

window.motionLabRender = api;
