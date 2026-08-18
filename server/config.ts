import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** Where finished videos and the library manifest live. Gitignored. */
export const rendersDir = path.join(projectRoot, "renders");
export const libraryFile = path.join(rendersDir, "library.json");

/** Production build output, served by the API process in `npm start`. */
export const distDir = path.join(projectRoot, "dist");

/** Kept in sync with vite.config.ts's proxy target. */
export const apiPort = Number(process.env.MOTION_LAB_API_PORT ?? 5174);

/** Vite's dev server, which serves /render.html in `npm run dev`. */
export const devAppPort = Number(process.env.MOTION_LAB_APP_PORT ?? 5173);

/**
 * Renders run one at a time by default. Both halves of a render are already
 * CPU-saturating (headless Chromium rasterizing 1080p+ frames, then ffmpeg
 * on `-preset slow`), so running two in parallel on one machine mostly makes
 * both slower and the progress bars less honest. Raise it only if you
 * actually have cores to spare.
 */
export const renderConcurrency = Math.max(1, Number(process.env.MOTION_LAB_CONCURRENCY ?? 1));

/** How long the shared Chromium instance stays warm after the queue drains.
 * Launching costs ~1s, so keeping it briefly makes back-to-back renders
 * noticeably snappier without leaving a browser running all day. */
export const browserIdleMs = Number(process.env.MOTION_LAB_BROWSER_IDLE_MS ?? 60_000);
