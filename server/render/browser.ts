import { type Browser, chromium } from "playwright";
import { browserIdleMs } from "../config.ts";

/**
 * One shared Chromium for the whole process, launched lazily and closed
 * again once the queue has been idle for a while.
 *
 * The CLI used to launch (and tear down) a browser per invocation, which is
 * fine for a one-shot command but wasteful for a server that may render
 * several clips in a row: the ~1s launch would be paid every time. Leases
 * are counted rather than assumed to be one, so raising
 * `renderConcurrency` doesn't close the browser out from under a job.
 */

let browserPromise: Promise<Browser> | null = null;
let leases = 0;
let idleTimer: NodeJS.Timeout | null = null;

function cancelIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

async function launch(): Promise<Browser> {
  const browser = await chromium.launch();
  // A crashed/killed browser must not leave a poisoned promise behind, or
  // every later render would reuse a dead handle.
  browser.on("disconnected", () => {
    browserPromise = null;
  });
  return browser;
}

export async function acquireBrowser(): Promise<Browser> {
  cancelIdleTimer();
  leases += 1;
  if (!browserPromise) {
    browserPromise = launch();
  }
  try {
    return await browserPromise;
  } catch (error) {
    browserPromise = null;
    leases = Math.max(0, leases - 1);
    throw error;
  }
}

export function releaseBrowser(): void {
  leases = Math.max(0, leases - 1);
  if (leases > 0) return;
  cancelIdleTimer();
  idleTimer = setTimeout(() => {
    void closeBrowser();
  }, browserIdleMs);
  // Don't hold the process open just to wait for the idle close.
  idleTimer.unref?.();
}

export async function closeBrowser(): Promise<void> {
  cancelIdleTimer();
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  try {
    const browser = await pending;
    await browser.close();
  } catch {
    // Already gone (crashed, or closed by a concurrent shutdown) — nothing
    // left to clean up.
  }
}
