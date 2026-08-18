import fs from "node:fs/promises";
import type {
  RenderOptions,
  RenderPlan,
  RenderRequest,
  RenderStage,
} from "../../src/shared/render-api.ts";
import { acquireBrowser, releaseBrowser } from "./browser.ts";
import { type FrameEncoder, startEncoder } from "./ffmpeg.ts";

/**
 * The deterministic renderer, shared by the HTTP backend (server/queue.ts)
 * and the CLI (scripts/render.ts) — one implementation, two front doors.
 *
 * The live in-browser export (src/export/capture.ts) plays the timeline in
 * real time and grabs whatever the canvas happens to hold each animation
 * frame; if a frame takes too long to rasterize, it is simply lost. Here the
 * timeline is paused and moved to an exact time before every capture, so
 * there is no real-time budget at all: a frame may take 5ms or 500ms and the
 * output is byte-for-byte the same either way.
 */

/** Thrown when a job is cancelled — distinguished from a real failure so the
 * queue can mark the job "cancelled" instead of "failed". */
export class RenderAbortedError extends Error {
  constructor(message = "render cancelado") {
    super(message);
    this.name = "RenderAbortedError";
  }
}

export interface RenderProgress {
  stage: RenderStage;
  framesDone: number;
  framesTotal: number;
}

export interface RenderEngineOptions {
  /** Origin serving /render.html — Vite in dev, the API process in prod. */
  baseUrl: string;
  request: RenderRequest;
  /**
   * Called once the render page has resolved the request, to decide where
   * the file goes. It's a callback rather than a plain path because the file
   * extension depends on `plan.transparent` (mp4 vs webm), and only the
   * render page knows which backgrounds are transparent — the server stays
   * ignorant of the background registry.
   */
  outputPath: (plan: RenderPlan) => string;
  signal?: AbortSignal;
  onProgress?: (progress: RenderProgress) => void;
}

export interface RenderEngineResult {
  plan: RenderPlan;
  outputPath: string;
  frames: number;
  bytes: number;
}

function renderPageUrl(baseUrl: string): string {
  return new URL("render.html", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}

/**
 * Asks the render page what it can render. Used by the CLI's interactive
 * picker and `--list`; the browser app doesn't need it, since it imports the
 * same registries directly.
 */
export async function readRenderOptions(baseUrl: string): Promise<RenderOptions> {
  const browser = await acquireBrowser();
  const context = await browser.newContext({ viewport: { width: 600, height: 600 } });
  try {
    const page = await context.newPage();
    await page.goto(renderPageUrl(baseUrl), { waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.motionLabRender), undefined, {
      timeout: 20_000,
    });
    return await page.evaluate(() => {
      const api = window.motionLabRender;
      if (!api) throw new Error("render page API missing");
      return api.listOptions();
    });
  } finally {
    await context.close().catch(() => {});
    releaseBrowser();
  }
}

export async function renderAnimation(options: RenderEngineOptions): Promise<RenderEngineResult> {
  const { baseUrl, request, signal, onProgress } = options;

  const throwIfAborted = (): void => {
    if (signal?.aborted) throw new RenderAbortedError();
  };

  // Only known once the plan resolves; tracked out here so the error path
  // can clean up a partially written file.
  let outputPath: string | null = null;

  throwIfAborted();
  onProgress?.({ stage: "starting", framesDone: 0, framesTotal: 0 });

  const browser = await acquireBrowser();
  // A fresh context per render: no state can leak between jobs, and closing
  // it is enough to clean up regardless of how the render ended.
  const context = await browser.newContext({ viewport: { width: 600, height: 600 } });

  let encoder: FrameEncoder | null = null;
  // Cancelling has to reach into ffmpeg too, otherwise aborting during the
  // encode phase would leave the process running until it finished anyway.
  const onAbort = () => encoder?.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const page = await context.newPage();
    await page.goto(renderPageUrl(baseUrl), { waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.motionLabRender), undefined, {
      timeout: 20_000,
    });
    throwIfAborted();

    // configure() validates the ids and freezes the timeline at t=0. It
    // throws for an unknown id, which surfaces here as a failed job with a
    // readable message rather than a silently wrong render.
    const plan = await page.evaluate((req) => {
      const api = window.motionLabRender;
      if (!api) throw new Error("render page API missing");
      return api.configure(req);
    }, request);

    outputPath = options.outputPath(plan);
    const totalFrames = Math.max(1, Math.ceil(plan.durationSeconds * request.fps));
    onProgress?.({ stage: "frames", framesDone: 0, framesTotal: totalFrames });

    encoder = startEncoder({
      outputPath,
      fps: request.fps,
      transparent: plan.transparent,
    });

    for (let index = 0; index < totalFrames; index += 1) {
      throwIfAborted();
      const seconds = Math.min(index / request.fps, plan.durationSeconds);
      // Seek and capture in a single round-trip — two evaluates per frame
      // would double the CDP latency for no benefit.
      const dataUrl = await page.evaluate(async (time) => {
        const api = window.motionLabRender;
        if (!api) throw new Error("render page API missing");
        api.seek(time);
        return api.captureFrame();
      }, seconds);

      const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
      await encoder.write(png);
      onProgress?.({ stage: "frames", framesDone: index + 1, framesTotal: totalFrames });
    }

    throwIfAborted();
    onProgress?.({ stage: "encoding", framesDone: totalFrames, framesTotal: totalFrames });
    await encoder.finish();
    encoder = null;
    // finish() resolves normally on an aborted encoder, so re-check before
    // treating a truncated file as a successful render.
    throwIfAborted();

    const stat = await fs.stat(outputPath);
    onProgress?.({ stage: "finished", framesDone: totalFrames, framesTotal: totalFrames });

    return { plan, outputPath, frames: totalFrames, bytes: stat.size };
  } catch (error) {
    encoder?.abort();
    // Never leave a partial video in the library directory — a half-written
    // file that looks like a finished render is worse than no file.
    if (outputPath) await fs.rm(outputPath, { force: true }).catch(() => {});
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await context.close().catch(() => {});
    releaseBrowser();
  }
}
