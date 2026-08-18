import type { RenderEvent, RenderJob, RenderRequest } from "@/shared/render-api";

/**
 * Thin typed client for the render API (server/app.ts).
 *
 * Everything is same-origin: in dev Vite proxies /api to the backend, in
 * production one process serves both. That's deliberate — no base URL to
 * configure per environment, and no CORS to get wrong.
 */

export interface HealthInfo {
  ok: boolean;
  /** False when ffmpeg isn't on the server's PATH — every render would fail
   * at the encode step, so the UI says so up front instead. */
  ffmpeg: boolean;
  concurrency: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    // The API answers errors as {error: "..."} — prefer that message over a
    // bare status code, it's usually directly actionable.
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body (a proxy error page, say) — keep the status line.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const renderApi = {
  health: () => request<HealthInfo>("/api/health"),
  list: () => request<RenderJob[]>("/api/renders"),
  create: (body: RenderRequest) =>
    request<RenderJob>("/api/renders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  cancel: (id: string) => request<RenderJob>(`/api/renders/${id}/cancel`, { method: "POST" }),
  remove: (id: string) => request<{ ok: true }>(`/api/renders/${id}`, { method: "DELETE" }),
  /** Inline for the <video> preview; `download` for a save-to-disk link. */
  fileUrl: (id: string, options: { download?: boolean } = {}) =>
    `/api/renders/${id}/file${options.download ? "?download=1" : ""}`,
};

export interface RenderEventHandlers {
  onEvent: (event: RenderEvent) => void;
  onConnectionChange: (online: boolean) => void;
}

/**
 * Subscribes to the server's job stream. EventSource reconnects on its own,
 * and every (re)connection starts with a full snapshot, so a dropped
 * connection heals into a consistent list rather than a stale one — which is
 * why the client never needs to poll.
 */
export function subscribeToRenderEvents(handlers: RenderEventHandlers): () => void {
  const source = new EventSource("/api/events");

  source.addEventListener("open", () => handlers.onConnectionChange(true));
  source.addEventListener("error", () => {
    // Fires both for a lost connection and while retrying; the backend being
    // down is the common case (someone ran `vite` instead of `npm run dev`).
    if (source.readyState !== EventSource.OPEN) handlers.onConnectionChange(false);
  });
  source.addEventListener("message", (event) => {
    try {
      handlers.onEvent(JSON.parse(event.data) as RenderEvent);
    } catch (error) {
      console.error("evento de render ilegible:", error);
    }
  });

  return () => source.close();
}
