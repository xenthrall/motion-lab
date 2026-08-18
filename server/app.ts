import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { DEFAULT_FPS, type RenderEvent, type RenderRequest } from "../src/shared/render-api.ts";
import { distDir, renderConcurrency } from "./config.ts";
import { renderFilePath } from "./library.ts";
import { cancelJob, createJob, getJob, listJobs, removeJob, subscribe } from "./queue.ts";
import { isFfmpegAvailable } from "./render/ffmpeg.ts";

/**
 * The HTTP surface of the render manager. Small on purpose: the interesting
 * logic lives in queue.ts and render/engine.ts, and these routes only
 * translate between HTTP and those.
 */

class BadRequestError extends Error {}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`"${field}" es obligatorio`);
  }
  return value;
}

/**
 * Note what is *not* validated here: whether the experiment/aspect/background
 * ids exist. The render page owns those registries (src/render/entry.ts), so
 * it does that check — which is why adding an experiment never means touching
 * the server. An unknown id comes back as a failed job with a clear message.
 */
function parseRenderRequest(body: unknown): RenderRequest {
  if (typeof body !== "object" || body === null) {
    throw new BadRequestError("se esperaba un objeto JSON");
  }
  const raw = body as Record<string, unknown>;
  const fps = raw.fps === undefined ? DEFAULT_FPS : Number(raw.fps);
  if (!Number.isFinite(fps) || fps < 1 || fps > 120) {
    throw new BadRequestError('"fps" debe estar entre 1 y 120');
  }
  return {
    experimentId: requireString(raw.experimentId, "experimentId"),
    aspectId: requireString(raw.aspectId, "aspectId"),
    backgroundId: requireString(raw.backgroundId, "backgroundId"),
    fps: Math.round(fps),
  };
}

function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  // A suffix range ("bytes=-500") asks for the last N bytes.
  const start = rawStart === "" ? Math.max(0, size - Number(rawEnd)) : Number(rawStart);
  const end = rawStart === "" || rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}

function nodeStreamToWeb(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

export interface AppOptions {
  /** Serve the production build from dist/ as well as the API. */
  serveStaticApp: boolean;
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono();

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      // The UI surfaces this: without ffmpeg every render would fail at the
      // encode step, and it's much friendlier to say so up front.
      ffmpeg: isFfmpegAvailable(),
      concurrency: renderConcurrency,
    }),
  );

  app.get("/api/renders", (c) => c.json(listJobs()));

  app.post("/api/renders", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new BadRequestError("cuerpo JSON inválido");
    }
    return c.json(createJob(parseRenderRequest(body)), 201);
  });

  app.get("/api/renders/:id", (c) => {
    const job = getJob(c.req.param("id"));
    return job ? c.json(job) : c.json({ error: "render no encontrado" }, 404);
  });

  app.post("/api/renders/:id/cancel", (c) => {
    const job = cancelJob(c.req.param("id"));
    return job ? c.json(job) : c.json({ error: "render no encontrado" }, 404);
  });

  app.delete("/api/renders/:id", async (c) => {
    const removed = await removeJob(c.req.param("id"));
    return removed ? c.json({ ok: true }) : c.json({ error: "render no encontrado" }, 404);
  });

  // Serves the finished video, with Range support so the <video> preview in
  // the UI can seek instead of having to download the whole clip first.
  app.get("/api/renders/:id/file", async (c) => {
    const job = getJob(c.req.param("id"));
    if (!job?.output) {
      return c.json({ error: "render no encontrado" }, 404);
    }

    // The path is always derived from the stored entry, never from the URL —
    // the id is a lookup key, not a filename.
    const filePath = renderFilePath(job.output.fileName);
    let size: number;
    try {
      size = (await fs.stat(filePath)).size;
    } catch {
      return c.json({ error: "el archivo del render ya no existe" }, 404);
    }

    const contentType = job.output.extension === "webm" ? "video/webm" : "video/mp4";
    const disposition =
      c.req.query("download") === "1" ? `attachment; filename="${job.output.fileName}"` : "inline";

    const rangeHeader = c.req.header("range");
    const range = rangeHeader ? parseRange(rangeHeader, size) : null;
    if (rangeHeader && !range) {
      return new Response(null, {
        status: 416,
        headers: { "content-range": `bytes */${size}` },
      });
    }

    const headers: Record<string, string> = {
      "content-type": contentType,
      "content-disposition": disposition,
      "accept-ranges": "bytes",
      // Each render has a unique filename, so the bytes at a URL never
      // change; but a deleted-and-recreated id should not serve stale data.
      "cache-control": "no-cache",
    };

    if (range) {
      headers["content-range"] = `bytes ${range.start}-${range.end}/${size}`;
      headers["content-length"] = String(range.end - range.start + 1);
      return new Response(
        nodeStreamToWeb(createReadStream(filePath, { start: range.start, end: range.end })),
        { status: 206, headers },
      );
    }

    headers["content-length"] = String(size);
    return new Response(nodeStreamToWeb(createReadStream(filePath)), { status: 200, headers });
  });

  // One SSE stream per open tab: the client gets the full list on connect and
  // then only deltas. Polling would either lag behind a render's progress or
  // hammer the server for the 99% of the time nothing is happening.
  app.get("/api/events", (c) =>
    streamSSE(c, async (stream) => {
      const send = (event: RenderEvent) => stream.writeSSE({ data: JSON.stringify(event) });

      await send({ type: "snapshot", jobs: listJobs() });
      const unsubscribe = subscribe((event) => {
        void send(event);
      });
      // Proxies (Vite's dev proxy included) will happily drop an idle
      // connection; a comment line every 25s keeps it alive.
      const keepAlive = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "" });
      }, 25_000);

      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          clearInterval(keepAlive);
          unsubscribe();
          resolve();
        });
      });
    }),
  );

  app.onError((error, c) => {
    if (error instanceof BadRequestError) {
      return c.json({ error: error.message }, 400);
    }
    console.error("[motion-lab] error no controlado:", error);
    return c.json({ error: String(error?.message ?? error) }, 500);
  });

  if (options.serveStaticApp) {
    // `serveStatic`'s root is resolved against process.cwd(), so derive it
    // rather than hardcoding "./dist" and hoping the server was started from
    // the project root.
    const root = path.relative(process.cwd(), distDir) || ".";
    app.use("/*", serveStatic({ root }));
    app.notFound(async (c) => {
      // Anything that isn't an API route or a built asset falls back to the
      // app shell — there's no client-side router today, but this keeps a
      // stray URL from returning a bare 404 page.
      if (c.req.path.startsWith("/api/")) {
        return c.json({ error: "no encontrado" }, 404);
      }
      try {
        const html = await fs.readFile(path.join(distDir, "index.html"), "utf8");
        return c.html(html);
      } catch {
        return c.text("No hay build de producción todavía. Ejecutá `npm run build`.", 404);
      }
    });
  }

  return app;
}
