import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  type RenderEvent,
  type RenderJob,
  type RenderRequest,
  isActiveStatus,
} from "../src/shared/render-api.ts";
import { renderConcurrency, rendersDir } from "./config.ts";
import { deleteRenderFile, ensureRendersDir, loadLibrary, saveLibrary } from "./library.ts";
import { RenderAbortedError, renderAnimation } from "./render/engine.ts";

/**
 * The render queue: the only place that mutates job state.
 *
 * Deliberately in-process and in-memory (with the finished jobs mirrored to
 * `renders/library.json`), not Redis/BullMQ/a database. This is a single-user
 * tool rendering one clip at a time on one machine — a job store that
 * survives a restart mid-render would add real operational weight to solve a
 * problem that doesn't exist here. Jobs that were running when the process
 * died are simply gone, which is also the honest answer: their output is too.
 */

type Listener = (event: RenderEvent) => void;

const jobs = new Map<string, RenderJob>();
const controllers = new Map<string, AbortController>();
const pending: string[] = [];
const listeners = new Set<Listener>();
let running = 0;
let baseUrlProvider: (() => string) | null = null;

/** Progress fires once per frame; pushing all of that down every SSE
 * connection would be hundreds of messages for one render and would make the
 * UI repaint far more often than a human can read. Stage changes and final
 * states always go out immediately — only frame counters get throttled. */
const PROGRESS_THROTTLE_MS = 200;

export function configureQueue(options: { baseUrl: () => string }): void {
  baseUrlProvider = options.baseUrl;
}

function emit(event: RenderEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[motion-lab] listener de eventos falló:", error);
    }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Newest first — the order the UI shows them in. */
export function listJobs(): RenderJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

/** Terminal jobs are the ones worth keeping across restarts — including
 * failures, whose error message is usually the thing you want to read later. */
async function persist(): Promise<void> {
  const terminal = listJobs().filter((job) => !isActiveStatus(job.status));
  try {
    await saveLibrary(terminal);
  } catch (error) {
    console.error("[motion-lab] no se pudo guardar la librería de renders:", error);
  }
}

function update(job: RenderJob, changes: Partial<RenderJob>): RenderJob {
  Object.assign(job, changes);
  jobs.set(job.id, job);
  return job;
}

export async function initQueue(): Promise<void> {
  await ensureRendersDir();
  for (const job of await loadLibrary()) {
    jobs.set(job.id, job);
  }
}

export function createJob(request: RenderRequest): RenderJob {
  const job: RenderJob = {
    id: randomUUID(),
    request,
    // Placeholders until the render page resolves the real labels. The
    // frontend already knows them locally and prefers its own, so this is
    // only what the CLI and a fresh page load see for a queued job.
    labels: {
      experiment: request.experimentId,
      aspect: request.aspectId,
      background: request.backgroundId,
    },
    status: "queued",
    stage: "queued",
    framesDone: 0,
    framesTotal: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    error: null,
    output: null,
  };

  jobs.set(job.id, job);
  pending.push(job.id);
  emit({ type: "job", job });
  void pump();
  return job;
}

export function cancelJob(id: string): RenderJob | undefined {
  const job = jobs.get(id);
  if (!job || !isActiveStatus(job.status)) return job;

  const queuedIndex = pending.indexOf(id);
  if (queuedIndex !== -1) pending.splice(queuedIndex, 1);

  // A running job unwinds through the engine's abort path, which also kills
  // ffmpeg and removes the partial file; a merely queued one can be marked
  // cancelled right here.
  controllers.get(id)?.abort();
  if (job.status === "queued") {
    update(job, { status: "cancelled", stage: "finished", finishedAt: new Date().toISOString() });
    emit({ type: "job", job });
    void persist();
  }
  return job;
}

export async function removeJob(id: string): Promise<boolean> {
  const job = jobs.get(id);
  if (!job) return false;

  if (isActiveStatus(job.status)) {
    cancelJob(id);
    // Give the engine a moment to release the file before deleting it, so
    // "cancel and delete in one click" doesn't race the abort path.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (job.output) {
    try {
      await deleteRenderFile(job.output.fileName);
    } catch (error) {
      console.error("[motion-lab] no se pudo borrar el archivo del render:", error);
    }
  }

  jobs.delete(id);
  controllers.delete(id);
  emit({ type: "removed", id });
  await persist();
  return true;
}

/**
 * Errors bubbling out of `page.evaluate` arrive with the browser-side stack
 * glued on ("Unknown experiment ...\n    at findOrThrow (...)"). The message
 * is the useful part and the stack is noise in a UI card, so keep the former.
 * The full error is still logged to the server console.
 */
function readableError(error: unknown): string {
  const message = String((error as Error)?.message ?? error);
  const useful = message
    .split("\n")
    .filter((line) => !/^\s+at\s/.test(line))
    .join("\n")
    .trim();
  return useful || message;
}

function buildFileName(job: RenderJob, transparent: boolean): string {
  const { experimentId, aspectId, backgroundId, fps } = job.request;
  const extension = transparent ? "webm" : "mp4";
  // The short id keeps two renders of the same setup from overwriting each
  // other while the name still reads as what it is.
  const suffix = job.id.slice(0, 8);
  return `${experimentId}-${aspectId}-${backgroundId}-${fps}fps-${suffix}.${extension}`;
}

async function run(job: RenderJob): Promise<void> {
  if (!baseUrlProvider) {
    throw new Error("queue: configureQueue() no fue llamado");
  }

  const controller = new AbortController();
  controllers.set(job.id, controller);

  update(job, {
    status: "running",
    stage: "starting",
    startedAt: new Date().toISOString(),
    error: null,
  });
  emit({ type: "job", job });

  let lastEmit = 0;
  let fileName: string | null = null;

  try {
    const result = await renderAnimation({
      baseUrl: baseUrlProvider(),
      request: job.request,
      signal: controller.signal,
      outputPath: (plan) => {
        fileName = buildFileName(job, plan.transparent);
        // Labels are only knowable once the page has resolved the request.
        update(job, { labels: plan.labels });
        return path.join(rendersDir, fileName);
      },
      onProgress: ({ stage, framesDone, framesTotal }) => {
        const stageChanged = job.stage !== stage;
        update(job, { stage, framesDone, framesTotal });
        const now = Date.now();
        if (stageChanged || now - lastEmit >= PROGRESS_THROTTLE_MS) {
          lastEmit = now;
          emit({ type: "job", job });
        }
      },
    });

    update(job, {
      status: "done",
      stage: "finished",
      finishedAt: new Date().toISOString(),
      labels: result.plan.labels,
      output: {
        fileName: path.basename(result.outputPath),
        extension: result.plan.transparent ? "webm" : "mp4",
        width: result.plan.width,
        height: result.plan.height,
        transparent: result.plan.transparent,
        durationSeconds: result.plan.durationSeconds,
        frames: result.frames,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    const cancelled = error instanceof RenderAbortedError || controller.signal.aborted;
    update(job, {
      status: cancelled ? "cancelled" : "failed",
      stage: "finished",
      finishedAt: new Date().toISOString(),
      error: cancelled ? null : readableError(error),
      output: null,
    });
    if (!cancelled) {
      console.error(`[motion-lab] render ${job.id} falló:`, error);
    }
  } finally {
    controllers.delete(job.id);
    emit({ type: "job", job });
    await persist();
  }
}

/** Starts as many queued jobs as the concurrency limit allows. */
async function pump(): Promise<void> {
  while (running < renderConcurrency && pending.length > 0) {
    const id = pending.shift();
    if (!id) break;
    const job = jobs.get(id);
    if (!job || job.status !== "queued") continue;

    running += 1;
    void run(job).finally(() => {
      running -= 1;
      void pump();
    });
  }
}

/** Cancels everything in flight — used on shutdown so Ctrl+C doesn't leave
 * an orphaned ffmpeg or a half-written file behind. */
export function cancelAll(): void {
  for (const job of jobs.values()) {
    if (isActiveStatus(job.status)) cancelJob(job.id);
  }
}
