/**
 * The one contract shared by all three sides of the render feature:
 *
 *   - the browser app (`src/main.ts` + `src/components/render-*.ts`),
 *   - the headless render page (`src/render/entry.ts`), and
 *   - the Node backend (`server/`) and CLI (`scripts/render.ts`).
 *
 * It deliberately contains only types and plain data — no DOM access, no
 * Node APIs — so the same file can be bundled by Vite for the browser and
 * imported directly by Node (which runs it through native type stripping,
 * see docs/dependencies.md). If something here stops being safe in both
 * environments, it doesn't belong in this file.
 */

/** Where a render is in its lifecycle. `done`/`failed`/`cancelled` are final. */
export type RenderStatus = "queued" | "running" | "done" | "failed" | "cancelled";

/** Which phase a running render is in — drives the progress label in the UI. */
export type RenderStage = "queued" | "starting" | "frames" | "encoding" | "finished";

/** Everything needed to reproduce a render. Ids are opaque strings on the
 * server side: it never resolves them itself, it hands them to the render
 * page, which owns the experiment/aspect/background registries. That's why
 * adding an experiment or a background needs no server change at all. */
export interface RenderRequest {
  experimentId: string;
  aspectId: string;
  backgroundId: string;
  fps: number;
}

/** The finished artifact on disk. */
export interface RenderOutput {
  fileName: string;
  extension: "mp4" | "webm";
  width: number;
  height: number;
  transparent: boolean;
  durationSeconds: number;
  frames: number;
  bytes: number;
}

export interface RenderLabels {
  experiment: string;
  aspect: string;
  background: string;
}

/** A render job: queued, in flight, or finished. The library on disk stores
 * the same shape for completed ones, so the UI has a single list to render. */
export interface RenderJob {
  id: string;
  request: RenderRequest;
  labels: RenderLabels;
  status: RenderStatus;
  stage: RenderStage;
  framesDone: number;
  framesTotal: number;
  /** ISO timestamps — strings, so a job survives JSON round-trips unchanged. */
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  output: RenderOutput | null;
}

export interface RenderOptionSummary {
  id: string;
  label: string;
  hint?: string;
}

/** The pickable options, as reported by the render page itself. */
export interface RenderOptions {
  experiments: RenderOptionSummary[];
  aspects: RenderOptionSummary[];
  backgrounds: RenderOptionSummary[];
}

/** What the render page resolves a request into, before any frame is drawn. */
export interface RenderPlan {
  width: number;
  height: number;
  transparent: boolean;
  backgroundColor: string;
  durationSeconds: number;
  labels: RenderLabels;
}

/** Pushed over SSE (`GET /api/events`) so every open tab stays in sync. */
export type RenderEvent =
  | { type: "snapshot"; jobs: RenderJob[] }
  | { type: "job"; job: RenderJob }
  | { type: "removed"; id: string };

export const FPS_CHOICES = [24, 30, 60] as const;
export const DEFAULT_FPS = 30;

/** A job still occupying the queue — the UI shows these with a progress bar,
 * and the server refuses to delete their output file mid-flight. */
export function isActiveStatus(status: RenderStatus): boolean {
  return status === "queued" || status === "running";
}

/** 0..1, used for progress bars. Encoding has no frame counter of its own,
 * so it holds at "frames done" until the file lands. */
export function jobProgress(job: RenderJob): number {
  if (job.status === "done") return 1;
  if (job.framesTotal <= 0) return 0;
  return Math.min(1, job.framesDone / job.framesTotal);
}

/**
 * The API the headless render page exposes on `window` for Playwright to
 * drive (see src/render/entry.ts). Unlike the old dev-only `window.__lab`
 * debug hook it replaced, this is a real, stable contract that exists in
 * production builds too — the renderer no longer depends on the lab UI's
 * internals, so the UI can be refactored freely without breaking renders.
 */
export interface RenderPageApi {
  listOptions(): RenderOptions;
  /** Loads an experiment and freezes it at t=0. Throws on an unknown id. */
  configure(request: RenderRequest): RenderPlan;
  /** Event-safe seek — see src/animations/README.md on suppressEvents. */
  seek(seconds: number): void;
  /** Rasterizes the current frame and returns it as a PNG data URL. */
  captureFrame(): Promise<string>;
}

declare global {
  interface Window {
    motionLabRender?: RenderPageApi;
  }
}
