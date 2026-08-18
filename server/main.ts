import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { apiPort, devAppPort } from "./config.ts";
import { cancelAll, configureQueue, initQueue } from "./queue.ts";
import { closeBrowser } from "./render/browser.ts";
import { isFfmpegAvailable } from "./render/ffmpeg.ts";

/**
 * Render API entry point.
 *
 * Written in TypeScript and started with plain `node server/main.ts` — Node
 * 22.18+ strips the types itself, so the backend gets full type checking
 * (`npm run typecheck`) with no bundler, no ts-node, and no build artifacts.
 * That's why the code here sticks to erasable TS only: no enums, no
 * namespaces, no parameter properties, and explicit `.ts` extensions on
 * relative imports.
 *
 * Two modes:
 *   dev  (default) — Vite serves the app and /render.html on its own port and
 *                    proxies /api here; this process is only the API.
 *   prod (--static)— this process serves the built dist/ as well, so a single
 *                    `node server/main.ts --static` runs the whole tool.
 */

function parseArgs(argv: string[]): Record<string, string | true> {
  const args: Record<string, string | true> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (match) args[match[1]] = match[2] ?? true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const serveStaticApp = args.static === true || args.mode === "prod";
const port = Number(args.port ?? apiPort);

/**
 * Where the headless renderer should load /render.html from. In dev that's
 * Vite (which has the source and HMR); in prod it's this very server, since
 * render.html is a real build output. Overridable for unusual setups.
 */
const appUrl =
  typeof args["app-url"] === "string"
    ? args["app-url"]
    : serveStaticApp
      ? `http://127.0.0.1:${port}/`
      : `http://127.0.0.1:${devAppPort}/`;

configureQueue({ baseUrl: () => appUrl });
await initQueue();

const server = serve({ fetch: createApp({ serveStaticApp }).fetch, port }, (info) => {
  const where = serveStaticApp
    ? `http://localhost:${info.port}`
    : `http://localhost:${info.port} (API) — app en ${appUrl}`;
  console.log(`[motion-lab] ${where}`);
  if (!isFfmpegAvailable()) {
    console.warn(
      "[motion-lab] aviso: no se encontró 'ffmpeg' en el PATH — los renders fallarán al codificar.\n" +
        "             Instalalo con 'sudo apt install ffmpeg' o 'brew install ffmpeg'.",
    );
  }
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[motion-lab] ${signal} — cerrando…`);
  // Order matters: cancelling first kills any ffmpeg child and removes the
  // partial file, so Ctrl+C never leaves junk in renders/.
  cancelAll();
  // Cleanup must never be able to *prevent* the shutdown. A wedged Chromium
  // would otherwise leave the process alive and holding the port, so Ctrl+C
  // appears to do nothing — give it a few seconds, then leave anyway.
  const forceExit = setTimeout(() => process.exit(0), 5_000);
  try {
    await closeBrowser();
  } catch {
    // Already gone, or refusing to close — either way we're leaving.
  }
  clearTimeout(forceExit);
  server.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
