#!/usr/bin/env node
import path from "node:path";
import * as p from "@clack/prompts";
import { createServer } from "vite";
import { projectRoot, rendersDir } from "../server/config.ts";
import { ensureRendersDir } from "../server/library.ts";
import { closeBrowser } from "../server/render/browser.ts";
import { readRenderOptions, renderAnimation } from "../server/render/engine.ts";
import { isFfmpegAvailable } from "../server/render/ffmpeg.ts";
import {
  DEFAULT_FPS,
  FPS_CHOICES,
  type RenderOptionSummary,
  type RenderRequest,
} from "../src/shared/render-api.ts";

/**
 * The offline renderer as a one-shot command.
 *
 * Same engine the backend uses (server/render/engine.ts) — this script only
 * adds the interactive picker and boots a throwaway Vite dev server so it
 * works on its own, without `npm run dev` running. For managing many renders
 * (queue, re-download, delete) use the Renders panel in the app instead.
 *
 * Usage:
 *   npm run render                       # arrow keys + enter for anything not passed as a flag
 *   npm run render -- --list             # print available ids and exit
 *   npm run render -- --experiment=mascot-adventure --aspect=vertical --background=midnight
 *   npm run render -- --experiment=... --aspect=... --background=... --fps=30 --yes
 *
 * The final confirmation only appears if at least one value came from a
 * prompt, so a fully-flagged run (or one with --yes) never blocks on stdin.
 */

/** Cancelling a prompt is not an error — thrown so the try/finally still
 * tears down the browser and the dev server, then caught for a clean exit. */
class RenderCancelled extends Error {}

function parseArgs(argv: string[]): Record<string, string | true> {
  const args: Record<string, string | true> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (match) args[match[1]] = match[2] ?? true;
  }
  return args;
}

function formatTable(rows: RenderOptionSummary[]): string {
  return rows.map(({ id, label }) => `  ${id.padEnd(20)} ${label}`).join("\n");
}

async function pickOne(
  message: string,
  items: RenderOptionSummary[],
  initialValue?: string,
): Promise<string> {
  const result = await p.select({
    message,
    initialValue,
    options: items.map((item) => ({ value: item.id, label: item.label, hint: item.hint })),
  });
  if (p.isCancel(result)) throw new RenderCancelled();
  return result;
}

async function resolveChoice(options: {
  flagValue: string | true | undefined;
  flagName: string;
  message: string;
  choices: RenderOptionSummary[];
  initialValue?: string;
  prompted: { value: boolean };
}): Promise<string> {
  const { flagValue, flagName, message, choices, initialValue, prompted } = options;
  if (typeof flagValue === "string") {
    if (!choices.some((choice) => choice.id === flagValue)) {
      throw new Error(
        `"${flagValue}" no es válido para ${flagName}. Opciones:\n${formatTable(choices)}`,
      );
    }
    return flagValue;
  }
  prompted.value = true;
  return pickOne(message, choices, initialValue);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!isFfmpegAvailable()) {
    console.error(
      "\nError: no se encontró 'ffmpeg' en el PATH.\n" +
        "Instalalo (por ejemplo 'sudo apt install ffmpeg' o 'brew install ffmpeg') y volvé a intentar.\n",
    );
    process.exitCode = 1;
    return;
  }

  p.intro("Tequia Motion Lab — render offline");

  const startSpinner = p.spinner();
  startSpinner.start("Iniciando dev server y navegador headless");
  const viteServer = await createServer({ root: projectRoot, logLevel: "warn" });
  await viteServer.listen();
  const address = viteServer.httpServer?.address();
  if (!address || typeof address === "string") {
    await viteServer.close();
    throw new Error("render: no se pudo determinar la dirección del dev server");
  }
  const baseUrl = `http://localhost:${address.port}/`;

  try {
    const options = await readRenderOptions(baseUrl);
    startSpinner.stop("Navegador listo");

    if (args.list) {
      console.log(`\nExperimentos:\n${formatTable(options.experiments)}`);
      console.log(`\nRelaciones de aspecto:\n${formatTable(options.aspects)}`);
      console.log(`\nFondos:\n${formatTable(options.backgrounds)}`);
      console.log();
      return;
    }

    const prompted = { value: false };
    const experimentId = await resolveChoice({
      flagValue: args.experiment,
      flagName: "--experiment",
      message: "¿Qué experimento querés renderizar?",
      choices: options.experiments,
      initialValue: options.experiments[0]?.id,
      prompted,
    });
    const aspectId = await resolveChoice({
      flagValue: args.aspect,
      flagName: "--aspect",
      message: "¿Qué relación de aspecto?",
      choices: options.aspects,
      initialValue: "square",
      prompted,
    });
    const backgroundId = await resolveChoice({
      flagValue: args.background,
      flagName: "--background",
      message: "¿Qué fondo?",
      choices: options.backgrounds,
      initialValue: "midnight",
      prompted,
    });

    let fps: number;
    if (typeof args.fps === "string") {
      fps = Number(args.fps);
      if (!Number.isFinite(fps) || fps < 1 || fps > 120) {
        throw new Error(`"${args.fps}" no es un valor de --fps válido (1-120).`);
      }
    } else {
      prompted.value = true;
      fps = Number(
        await pickOne(
          "¿Cuadros por segundo?",
          FPS_CHOICES.map((value) => ({
            id: String(value),
            label: `${value} fps`,
            hint:
              value === DEFAULT_FPS
                ? "estándar, recomendado"
                : value < DEFAULT_FPS
                  ? "cine, render más rápido"
                  : "más fluido, render más lento",
          })),
          String(DEFAULT_FPS),
        ),
      );
    }

    const request: RenderRequest = { experimentId, aspectId, backgroundId, fps };

    if (prompted.value && !args.yes) {
      const label =
        options.experiments.find((item) => item.id === experimentId)?.label ?? experimentId;
      const confirmed = await p.confirm({
        message: `Renderizar "${label}" — ${aspectId} / ${backgroundId} / ${fps}fps. ¿Confirmar?`,
      });
      if (p.isCancel(confirmed) || !confirmed) throw new RenderCancelled();
    }

    await ensureRendersDir();
    const renderSpinner = p.spinner();
    renderSpinner.start("Preparando render");

    const result = await renderAnimation({
      baseUrl,
      request,
      outputPath: (plan) => {
        if (typeof args.out === "string") return path.resolve(args.out);
        const extension = plan.transparent ? "webm" : "mp4";
        // Stable, overwritable name: a one-shot command re-run with the same
        // settings should replace its own output, not pile up copies. The
        // server adds a unique suffix instead, because there the whole point
        // is keeping a library.
        return path.join(rendersDir, `${experimentId}-${aspectId}-${backgroundId}.${extension}`);
      },
      onProgress: ({ stage, framesDone, framesTotal }) => {
        if (stage === "frames") {
          renderSpinner.message(`frame ${framesDone}/${framesTotal}`);
        } else if (stage === "encoding") {
          renderSpinner.message("codificando con ffmpeg");
        }
      },
    });

    renderSpinner.stop(
      `${result.frames} frames · ${result.plan.width}x${result.plan.height} · ${(result.bytes / 1_000_000).toFixed(1)} MB`,
    );
    p.outro(`Listo: ${result.outputPath}`);
  } finally {
    await closeBrowser();
    await viteServer.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof RenderCancelled) {
    p.cancel("Cancelado.");
    process.exitCode = 0;
    return;
  }
  p.log.error(String((error as Error)?.stack ?? error));
  process.exitCode = 1;
});
