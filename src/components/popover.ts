export interface PopoverController {
  open(): void;
  close(): void;
  toggle(): void;
}

/** Only one popover open at a time — opening one closes any other. */
const openPopovers = new Set<() => void>();

/**
 * A trigger button + an absolutely-positioned panel, closing on outside
 * click, Escape, or when another popover opens. Positioning itself is
 * plain CSS (the caller wraps trigger+panel in a `relative` container and
 * gives the panel `absolute`), this only owns the open/close behavior.
 */
export function createPopover(trigger: HTMLElement, panel: HTMLElement): PopoverController {
  let handleOutside: ((event: PointerEvent) => void) | null = null;
  let handleKey: ((event: KeyboardEvent) => void) | null = null;

  function close(): void {
    panel.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
    if (handleOutside) document.removeEventListener("pointerdown", handleOutside, true);
    if (handleKey) document.removeEventListener("keydown", handleKey);
    handleOutside = null;
    handleKey = null;
    openPopovers.delete(close);
  }

  function open(): void {
    for (const closeOther of [...openPopovers]) closeOther();
    panel.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
    handleOutside = (event) => {
      if (!panel.contains(event.target as Node) && !trigger.contains(event.target as Node)) close();
    };
    handleKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleKey);
    openPopovers.add(close);
  }

  function toggle(): void {
    if (panel.classList.contains("hidden")) open();
    else close();
  }

  trigger.addEventListener("click", toggle);

  return { open, close, toggle };
}
