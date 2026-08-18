import fs from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../src/shared/render-api.ts";
import { libraryFile, rendersDir } from "./config.ts";

/**
 * The render library: finished videos in `renders/`, plus a `library.json`
 * manifest describing them.
 *
 * A manifest rather than "just read the directory" because the interesting
 * metadata (which experiment, which background, how many frames, how long it
 * took) cannot be recovered from a filename, and encoding it *into* the
 * filename would make renders awkward to hand to anyone else. The files stay
 * plain, movable videos; the manifest is the index.
 */

/** Guards every filename that came from JSON or an HTTP request before it is
 * turned into a path. Nothing outside `renders/` is ever reachable. */
export function renderFilePath(fileName: string): string {
  if (!fileName || fileName !== path.basename(fileName)) {
    throw new Error(`nombre de archivo de render inválido: ${fileName}`);
  }
  return path.join(rendersDir, fileName);
}

export async function ensureRendersDir(): Promise<void> {
  await fs.mkdir(rendersDir, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the manifest, dropping entries whose video is gone — deleting files
 * straight out of `renders/` is a perfectly reasonable thing to do, and the
 * UI should reflect the disk rather than a stale index.
 */
export async function loadLibrary(): Promise<RenderJob[]> {
  let raw: string;
  try {
    raw = await fs.readFile(libraryFile, "utf8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[motion-lab] ${libraryFile} ilegible, se empieza con una librería vacía`);
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const jobs: RenderJob[] = [];
  for (const entry of parsed as RenderJob[]) {
    if (!entry?.id) continue;
    if (entry.output) {
      try {
        if (!(await fileExists(renderFilePath(entry.output.fileName)))) continue;
      } catch {
        continue;
      }
    }
    jobs.push(entry);
  }
  return jobs;
}

/** Atomic write — a crash mid-save must not leave a truncated manifest that
 * would lose the whole library on next boot. */
export async function saveLibrary(jobs: RenderJob[]): Promise<void> {
  await ensureRendersDir();
  const tmp = `${libraryFile}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
  await fs.rename(tmp, libraryFile);
}

export async function deleteRenderFile(fileName: string): Promise<void> {
  await fs.rm(renderFilePath(fileName), { force: true });
}
