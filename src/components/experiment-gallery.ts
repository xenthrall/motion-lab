import { experimentIcon } from "./experiment-icons";
import { uiIcon } from "./icons";
import { setToggleGroupSelection, wireToggleGroup } from "./toggle-group";

export interface GalleryItem {
  id: string;
  label: string;
  description: string;
}

export interface ExperimentGallery {
  setSelected(id: string): void;
  setEnabled(enabled: boolean): void;
}

const CARD_CLASS =
  "group flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-brand-ring/40 hover:bg-brand/5 aria-pressed:border-brand-ring/60 aria-pressed:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface md:w-full";

/**
 * Selectable cards, one per registered experiment — a gallery so it reads
 * as "these are the animations", not just a settings list. Selecting one
 * is meant to immediately start it looping (main.ts wires that via
 * onSelect, this component only reports the pick).
 */
export function createExperimentGallery(
  container: Element,
  items: GalleryItem[],
  onSelect: (id: string) => void,
): ExperimentGallery {
  container.innerHTML = items
    .map(
      (item, i) => `
    <button type="button" data-value="${item.id}" class="${CARD_CLASS}" aria-pressed="${i === 0}">
      <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand">
        ${uiIcon(experimentIcon(item.id))}
      </span>
      <span class="text-sm font-semibold text-ink">${item.label}</span>
      <span class="line-clamp-2 text-xs text-ink-muted">${item.description}</span>
    </button>
  `,
    )
    .join("");

  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-value]"));
  wireToggleGroup(buttons, onSelect);

  return {
    setSelected(id: string) {
      setToggleGroupSelection(buttons, id);
    },
    setEnabled(enabled: boolean) {
      for (const button of buttons) button.disabled = !enabled;
    },
  };
}
