export interface TimelineBar {
  setDuration(seconds: number): void;
  setProgress(seconds: number): void;
  setEnabled(enabled: boolean): void;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * A scrubbable progress bar for the current experiment's GSAP timeline —
 * click or drag to seek. Purely presentational: it reports seconds via
 * `onSeek` and reflects seconds via `setProgress`; main.ts is the one
 * that actually calls `timeline.pause(seconds)`.
 */
export function createTimelineBar(
  container: Element,
  onSeek: (seconds: number) => void,
): TimelineBar {
  container.innerHTML = `
    <div class="flex items-center gap-3">
      <span id="time-current" class="w-9 shrink-0 text-right text-xs tabular-nums text-neutral-400">0:00</span>
      <div
        id="scrub-track"
        class="group relative h-2 flex-1 cursor-pointer touch-none rounded-full bg-white/10"
      >
        <div
          id="scrub-fill"
          class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-light to-brand"
          style="width: 0%"
        ></div>
        <div
          id="scrub-handle"
          class="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-brand transition-transform group-hover:scale-110"
          style="left: 0%"
        ></div>
      </div>
      <span id="time-total" class="w-9 shrink-0 text-xs tabular-nums text-neutral-400">0:00</span>
    </div>
  `;

  const track = container.querySelector<HTMLDivElement>("#scrub-track");
  const fill = container.querySelector<HTMLDivElement>("#scrub-fill");
  const handle = container.querySelector<HTMLDivElement>("#scrub-handle");
  const currentLabel = container.querySelector<HTMLSpanElement>("#time-current");
  const totalLabel = container.querySelector<HTMLSpanElement>("#time-total");
  if (!track || !fill || !handle || !currentLabel || !totalLabel) {
    throw new Error("createTimelineBar: expected elements were not found after render");
  }

  let duration = 0;
  let enabled = true;

  const seekFromClientX = (clientX: number): void => {
    if (!enabled || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const fraction =
      rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    onSeek(fraction * duration);
  };

  let dragging = false;
  track.addEventListener("pointerdown", (event) => {
    if (!enabled) return;
    dragging = true;
    track.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  });
  track.addEventListener("pointermove", (event) => {
    if (dragging) seekFromClientX(event.clientX);
  });
  track.addEventListener("pointerup", () => {
    dragging = false;
  });
  track.addEventListener("pointercancel", () => {
    dragging = false;
  });

  return {
    setDuration(seconds: number) {
      duration = seconds;
      totalLabel.textContent = formatTime(seconds);
    },
    setProgress(seconds: number) {
      const pct = duration > 0 ? Math.min(100, Math.max(0, (seconds / duration) * 100)) : 0;
      fill.style.width = `${pct}%`;
      handle.style.left = `${pct}%`;
      currentLabel.textContent = formatTime(seconds);
    },
    setEnabled(next: boolean) {
      enabled = next;
      track.classList.toggle("opacity-50", !enabled);
      track.classList.toggle("pointer-events-none", !enabled);
    },
  };
}
