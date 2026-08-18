#!/usr/bin/env node
/**
 * Offline, deterministic renderer — the "no matter how heavy the
 * animation, it never lags" export path.
 *
 * The live in-browser export (src/export/capture.ts) plays the timeline
 * in real time and grabs whatever's on the canvas each
 * requestAnimationFrame; if a frame takes too long to rasterize, it's
 * just gone. This script instead drives the *same* GSAP timeline through
 * a headless browser and, for every frame, pauses it and jumps to that
 * exact time (`timeline.time(t, false)` — the same event-safe seek the
 * scrubber uses, see src/animations/README.md) before rasterizing. There
 * is no real-time budget: a frame can take 5ms or 500ms, the output is
 * identical either way. ffmpeg then encodes the frame sequence with
 * settings no live MediaRecorder capture could use (slow presets, high
 * bitrate) since encoding time no longer matters either.
 *
 * Requires:
 *   - `ffmpeg` on PATH (not bundled — see docs/dependencies.md).
 *   - Playwright's Chromium: `npx playwright install chromium` once.
 *
 * Usage:
 *   node scripts/render.mjs                     # interactive: arrow keys + enter for whatever wasn't passed as a flag
 *   node scripts/render.mjs --list               # print available ids and exit
 *   node scripts/render.mjs --experiment=mascot-adventure --aspect=vertical --background=midnight --fps=30
 *   node scripts/render.mjs --experiment=mascot-adventure   # only prompts for aspect/background/fps
 *   node scripts/render.mjs --experiment=... --aspect=... --background=... --fps=... --yes  # fully scriptable, no prompts at all
 *
 * A run only shows the final confirmation prompt if at least one value
 * came from an interactive pick (not a flag) — passing all four flags
 * (or adding --yes) never blocks on stdin, safe for scripts/CI.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import { chromium } from "playwright";
import { createServer } from "vite";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Thrown when the user cancels a prompt (Ctrl+C, Esc) or declines the
 * final confirmation — caught at the top level for a clean exit(0)
 * instead of an "error". Thrown, not process.exit()'d directly, so the
 * try/finally chain in main() still closes the browser/dev server. */
class RenderCancelled extends Error {}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) args[match[1]] = match[2] ?? true;
  }
  return args;
}

function requireFfmpeg() {
  const check = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (check.error || check.status !== 0) {
    console.error(
      "\nError: no se encontró 'ffmpeg' en el PATH.\n" +
        "Instalalo (por ejemplo 'sudo apt install ffmpeg' o 'brew install ffmpeg') y volvé a intentar.\n",
    );
    process.exit(1);
  }
}

function formatTable(rows) {
  return rows.map(({ id, label }) => `  ${id.padEnd(20)} ${label}`).join("\n");
}

/** Arrow-keys-and-enter select, wrapping @clack/prompts. Cancel -> RenderCancelled. */
async function pickOne(message, items, initialValue) {
  const result = await p.select({
    message,
    initialValue,
    options: items.map((item) => ({
      value: item.id,
      label: item.label,
      hint: item.hint ?? item.description,
    })),
  });
  if (p.isCancel(result)) throw new RenderCancelled();
  return result;
}

async function confirmOrCancel(message) {
  const result = await p.confirm({ message });
  if (p.isCancel(result) || !result) throw new RenderCancelled();
}

/**
 * Resolves one setting: use the CLI flag if given (validated against the
 * live list), otherwise prompt interactively. `prompted` tracks whether
 * *any* setting actually needed a prompt, so main() only asks for a final
 * confirmation when this was a genuinely interactive run — a fully
 * flagged invocation (all four --experiment/--aspect/--background/--fps)
 * stays scriptable/non-interactive, the same as before this feature.
 */
async function resolveChoice({ flagValue, flagName, message, options, initialValue, prompted }) {
  if (flagValue !== undefined) {
    if (!options.some((option) => option.id === flagValue)) {
      throw new Error(
        `"${flagValue}" no es válido para ${flagName}. Opciones:\n${formatTable(options)}`,
      );
    }
    return flagValue;
  }
  prompted.value = true;
  return pickOne(message, options, initialValue);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireFfmpeg();

  p.intro("Tequia Motion Lab — render offline");

  const startSpinner = p.spinner();
  startSpinner.start("Iniciando dev server y navegador headless");
  const viteServer = await createServer({ root: projectRoot, logLevel: "warn" });
  await viteServer.listen();
  const address = viteServer.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("render: could not determine the dev server's address");
  }
  const baseUrl = `http://localhost:${address.port}/`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 960 } });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__lab?.render), { timeout: 15000 });
    startSpinner.stop("Navegador listo");

    const [experimentOptions, aspectOptions, backgroundOptions] = await page.evaluate(() => [
      window.__lab.render.listExperiments(),
      window.__lab.render.listAspects(),
      window.__lab.render.listBackgrounds(),
    ]);

    if (args.list) {
      console.log(`\nExperimentos:\n${formatTable(experimentOptions)}`);
      console.log(`\nRelaciones de aspecto:\n${formatTable(aspectOptions)}`);
      console.log(`\nFondos:\n${formatTable(backgroundOptions)}`);
      console.log();
      return;
    }

    const prompted = { value: false };
    const experimentId = await resolveChoice({
      flagValue: args.experiment,
      flagName: "--experiment",
      message: "¿Qué experimento querés renderizar?",
      options: experimentOptions,
      initialValue: experimentOptions[0]?.id,
      prompted,
    });
    const aspectId = await resolveChoice({
      flagValue: args.aspect,
      flagName: "--aspect",
      message: "¿Qué relación de aspecto?",
      options: aspectOptions,
      initialValue: "square",
      prompted,
    });
    const backgroundId = await resolveChoice({
      flagValue: args.background,
      flagName: "--background",
      message: "¿Qué fondo?",
      options: backgroundOptions,
      initialValue: "midnight",
      prompted,
    });
    let fps;
    if (args.fps !== undefined) {
      fps = Number(args.fps);
    } else {
      prompted.value = true;
      fps = Number(
        await pickOne(
          "¿Cuadros por segundo?",
          [
            { id: "24", label: "24 fps", hint: "cine, render más rápido" },
            { id: "30", label: "30 fps", hint: "estándar, recomendado" },
            { id: "60", label: "60 fps", hint: "más fluido, render más lento" },
          ],
          "30",
        ),
      );
    }

    // Only ask for a final confirmation if this was actually interactive
    // (at least one value came from a prompt, not a flag) and --yes
    // wasn't passed — a fully-flagged invocation stays fire-and-forget,
    // the same as it was before this feature (important for scripting/CI:
    // nothing here should block on stdin when every value is already known).
    if (prompted.value && !args.yes) {
      const experimentLabel =
        experimentOptions.find((option) => option.id === experimentId)?.label ?? experimentId;
      await confirmOrCancel(
        `Renderizar "${experimentLabel}" — ${aspectId} / ${backgroundId} / ${fps}fps. ¿Confirmar?`,
      );
    }

    await page.evaluate(
      ({ experimentId, aspectId, backgroundId }) => {
        window.__lab.render.selectExperiment(experimentId);
        window.__lab.render.selectAspect(aspectId);
        window.__lab.render.selectBackground(backgroundId);
      },
      { experimentId, aspectId, backgroundId },
    );
    // selecting an experiment auto-plays it — stop that, we're about to
    // drive time manually, frame by frame.
    await page.evaluate(() => {
      window.__lab.timeline.pause();
    });

    const [duration, settings] = await page.evaluate(() => [
      window.__lab.timeline.duration(),
      window.__lab.render.getExportSettings(),
    ]);
    const totalFrames = Math.max(1, Math.ceil(duration * fps));

    const renderSpinner = p.spinner();
    renderSpinner.start(
      `Renderizando — ${settings.width}x${settings.height} @ ${fps}fps — ${totalFrames} frames (${duration.toFixed(2)}s)`,
    );

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tequia-render-"));
    try {
      for (let i = 0; i < totalFrames; i++) {
        const t = Math.min(i / fps, duration);
        const dataUrl = await page.evaluate(
          async ({ t, settings }) => {
            window.__lab.timeline.pause();
            window.__lab.timeline.time(t, false);
            const canvas = document.createElement("canvas");
            canvas.width = settings.width;
            canvas.height = settings.height;
            const ctx = canvas.getContext("2d", { alpha: true });
            await window.__lab.render.rasterizeSvgToCanvas(window.__lab.stage.svg, ctx, settings);
            return canvas.toDataURL("image/png");
          },
          { t, settings },
        );
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        const framePath = path.join(tmpDir, `frame-${String(i).padStart(6, "0")}.png`);
        fs.writeFileSync(framePath, Buffer.from(base64, "base64"));
        if (i % 15 === 0 || i === totalFrames - 1) {
          renderSpinner.message(`frame ${i + 1}/${totalFrames}`);
        }
      }
      renderSpinner.stop(`${totalFrames} frames capturados`);

      const outDir = path.join(projectRoot, "renders");
      fs.mkdirSync(outDir, { recursive: true });
      const extension = settings.transparent ? "webm" : "mp4";
      const outPath =
        args.out ?? path.join(outDir, `${experimentId}-${aspectId}-${backgroundId}.${extension}`);

      const encodeSpinner = p.spinner();
      encodeSpinner.start(`Codificando con ffmpeg (${extension})`);
      await encode(tmpDir, outPath, fps, settings.transparent);
      encodeSpinner.stop("Codificación lista");

      p.outro(`Listo: ${outPath}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } finally {
    await browser.close();
    await viteServer.close();
  }
}

function encode(framesDir, outPath, fps, transparent) {
  const inputPattern = path.join(framesDir, "frame-%06d.png");
  const ffmpegArgs = transparent
    ? [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        inputPattern,
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-crf",
        "15",
        "-b:v",
        "0",
        outPath,
      ]
    : [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        inputPattern,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "15",
        "-preset",
        "slow",
        "-movflags",
        "+faststart",
        outPath,
      ];

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ffmpegArgs, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

main().catch((error) => {
  if (error instanceof RenderCancelled) {
    p.cancel("Cancelado.");
    process.exitCode = 0;
    return;
  }
  p.log.error(String(error?.stack ?? error));
  process.exitCode = 1;
});
