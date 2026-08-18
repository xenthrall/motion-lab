#!/usr/bin/env node
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { apiPort, devAppPort, projectRoot } from "../server/config.ts";

/**
 * `npm run dev` — starts Vite and the render API side by side.
 *
 * Two processes rather than one (Vite in middleware mode inside the API)
 * because Vite's dev server is Connect-based while the API is a Hono/fetch
 * app; bridging the two costs more complexity than it saves. With the /api
 * proxy in vite.config.ts the browser still sees a single origin, so the
 * frontend never needs an environment-specific base URL.
 *
 * Either process exiting takes the other down — a half-running dev
 * environment (app with no API, or API with nothing to render) is more
 * confusing than a clean stop.
 */

const children: ChildProcess[] = [];
let shuttingDown = false;

function stopAll(signal: NodeJS.Signals = "SIGTERM"): void {
  for (const child of children) {
    if (child.exitCode === null) child.kill(signal);
  }
  // Escalate if something refuses to go (a render wedged inside Chromium, for
  // instance). Without this, Ctrl+C can leave the ports bound and the next
  // `npm run dev` fails on --strictPort for no visible reason.
  const escalate = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }, 5_000);
  escalate.unref();
}

function start(name: string, args: string[]): ChildProcess {
  // process.execPath, not "npx"/"vite": one less shell layer, and signals
  // reach the real process instead of a wrapper that may ignore them.
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[dev] ${name} terminó (${signal ?? code}) — cerrando el resto…`);
    stopAll();
    process.exitCode = code ?? 1;
  });

  children.push(child);
  return child;
}

start("api", [path.join(projectRoot, "server", "main.ts"), `--port=${apiPort}`]);
start("vite", [
  path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"),
  "--port",
  String(devAppPort),
  "--strictPort",
]);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shuttingDown = true;
    stopAll(signal);
  });
}
