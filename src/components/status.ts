import { ui, uiIcon } from "./icons";

export type StatusKind = "idle" | "recording" | "success" | "error";

export interface Status {
  set(text: string, kind?: StatusKind): void;
}

const BADGE_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors";

const KIND_CLASSES: Record<StatusKind, string> = {
  idle: "bg-surface-muted text-ink-muted ring-1 ring-line",
  recording: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-1 ring-amber-400/30",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-400/30",
  error: "bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-red-400/30",
};

export function createStatus(container: Element): Status {
  container.innerHTML = `
    <span id="status-badge" class="${BADGE_BASE} ${KIND_CLASSES.idle}">
      <span id="status-icon" class="inline-flex"></span>
      <span id="status-text"></span>
    </span>
  `;

  const badge = container.querySelector<HTMLSpanElement>("#status-badge");
  const iconSlot = container.querySelector<HTMLSpanElement>("#status-icon");
  const textSlot = container.querySelector<HTMLSpanElement>("#status-text");
  if (!badge || !iconSlot || !textSlot) {
    throw new Error("createStatus: expected elements were not found after render");
  }

  return {
    set(text, kind = "idle") {
      textSlot.textContent = text;
      badge.className = `${BADGE_BASE} ${KIND_CLASSES[kind]}`;
      iconSlot.innerHTML =
        kind === "recording" ? uiIcon(ui.loader, "w-3.5 h-3.5 animate-spin") : "";
    },
  };
}
