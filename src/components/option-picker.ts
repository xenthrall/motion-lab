import { ui, uiIcon } from "./icons";
import { createPopover } from "./popover";
import { setToggleGroupSelection, wireToggleGroup } from "./toggle-group";

export interface OptionPickerItem {
  id: string;
  label: string;
  /** Pre-rendered icon markup (from uiIcon/brandIcon/transparencySwatch). */
  iconHtml: string;
}

export interface OptionPicker {
  setSelected(id: string): void;
  setEnabled(enabled: boolean): void;
}

/**
 * The "centralized point that opens a mini modal" selector: a compact
 * trigger button showing the current selection, which opens a small
 * popover panel listing every option. Used for aspect ratio and file
 * format — anywhere a pill row would otherwise take up permanent space.
 */
export function createOptionPicker(
  container: Element,
  groupLabel: string,
  items: OptionPickerItem[],
  onSelect: (id: string) => void,
): OptionPicker {
  if (items.length === 0) {
    throw new Error("createOptionPicker: items must not be empty");
  }
  const initial = items[0];

  container.innerHTML = `
    <div class="relative">
      <button
        type="button"
        id="picker-trigger"
        class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm text-ink transition hover:border-brand-ring/40 disabled:cursor-not-allowed disabled:opacity-40"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span id="picker-trigger-icon" class="inline-flex">${initial.iconHtml}</span>
        <span class="flex flex-col leading-tight">
          <span class="text-[10px] font-medium uppercase tracking-wide text-ink-subtle">${groupLabel}</span>
          <span id="picker-trigger-label" class="font-medium">${initial.label}</span>
        </span>
        ${uiIcon(ui.chevronDown, "w-3.5 h-3.5 text-ink-subtle")}
      </button>
      <div
        id="picker-panel"
        class="absolute left-0 z-20 mt-2 hidden w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl"
      >
        ${items
          .map(
            (item, i) => `
          <button
            type="button"
            data-value="${item.id}"
            aria-pressed="${i === 0}"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition hover:bg-surface-muted aria-pressed:bg-brand/10 aria-pressed:text-brand"
          >
            ${item.iconHtml}
            <span>${item.label}</span>
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  const trigger = container.querySelector<HTMLButtonElement>("#picker-trigger");
  const triggerIcon = container.querySelector<HTMLSpanElement>("#picker-trigger-icon");
  const triggerLabel = container.querySelector<HTMLSpanElement>("#picker-trigger-label");
  const panel = container.querySelector<HTMLDivElement>("#picker-panel");
  if (!trigger || !triggerIcon || !triggerLabel || !panel) {
    throw new Error("createOptionPicker: expected elements were not found after render");
  }

  const popover = createPopover(trigger, panel);
  const itemButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button[data-value]"));

  const reflectSelection = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    triggerIcon.innerHTML = item.iconHtml;
    triggerLabel.textContent = item.label;
  };

  wireToggleGroup(itemButtons, (id) => {
    reflectSelection(id);
    popover.close();
    onSelect(id);
  });

  return {
    setSelected(id: string) {
      setToggleGroupSelection(itemButtons, id);
      reflectSelection(id);
    },
    setEnabled(enabled: boolean) {
      trigger.disabled = !enabled;
      if (!enabled) popover.close();
    },
  };
}
