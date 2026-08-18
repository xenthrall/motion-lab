import {
  type ExperimentGallery,
  type GalleryItem,
  createExperimentGallery,
} from "./experiment-gallery";
import { ui, uiIcon } from "./icons";
import type { Theme } from "./theme";

export type LabView = "lab" | "renders";

export interface SidebarCallbacks {
  onExperimentSelect: (id: string) => void;
  onThemeToggle: () => void;
  onViewChange: (view: LabView) => void;
}

export interface Sidebar {
  gallery: ExperimentGallery;
  setTheme: (theme: Theme) => void;
  setView: (view: LabView) => void;
  /** Number of queued/running renders, shown as a badge so progress is
   * visible from the Lab view too. */
  setRenderBadge: (count: number) => void;
}

const NAV_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink aria-pressed:bg-brand/10 aria-pressed:text-brand";

export function createSidebar(
  container: Element,
  galleryItems: GalleryItem[],
  callbacks: SidebarCallbacks,
): Sidebar {
  container.innerHTML = `
    <div class="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-5">
      <div>
        <h1 class="text-base font-bold tracking-tight text-ink md:text-lg">Tequia Motion Lab</h1>
        <p class="text-xs text-ink-muted">Panel de animación</p>
      </div>
      <button
        id="theme-toggle-btn"
        type="button"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition hover:border-brand-ring/40 hover:text-ink"
        aria-label="Cambiar tema"
      >
        <span id="theme-toggle-icon" class="inline-flex">${uiIcon(ui.sun)}</span>
      </button>
    </div>

    <nav id="view-nav" class="flex gap-1 border-t border-line px-4 py-2 md:border-t-0 md:flex-col md:px-3">
      <button type="button" data-view="lab" class="${NAV_ITEM_CLASS}" aria-pressed="true">
        ${uiIcon(ui.sparkles)}<span>Laboratorio</span>
      </button>
      <button type="button" data-view="renders" class="${NAV_ITEM_CLASS}" aria-pressed="false">
        ${uiIcon(ui.film)}<span>Renders</span>
        <span id="render-badge" class="ml-auto hidden min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[10px] font-semibold text-white"></span>
      </button>
    </nav>

    <div class="border-t border-line px-4 py-3 md:px-5">
      <h2 class="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-ink-subtle md:block">
        Experimentos
      </h2>
      <div id="gallery-container" class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0"></div>
    </div>
  `;

  const themeToggleBtn = container.querySelector<HTMLButtonElement>("#theme-toggle-btn");
  const themeToggleIcon = container.querySelector<HTMLSpanElement>("#theme-toggle-icon");
  const galleryContainer = container.querySelector<HTMLDivElement>("#gallery-container");
  const renderBadge = container.querySelector<HTMLSpanElement>("#render-badge");
  const navButtons = Array.from(
    container.querySelectorAll<HTMLButtonElement>("#view-nav button[data-view]"),
  );
  if (!themeToggleBtn || !themeToggleIcon || !galleryContainer || !renderBadge) {
    throw new Error("createSidebar: expected elements were not found after render");
  }

  const setView = (view: LabView): void => {
    for (const button of navButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    }
  };

  for (const button of navButtons) {
    button.addEventListener("click", () => {
      const view = button.dataset.view as LabView;
      setView(view);
      callbacks.onViewChange(view);
    });
  }

  themeToggleBtn.addEventListener("click", () => callbacks.onThemeToggle());
  const gallery = createExperimentGallery(
    galleryContainer,
    galleryItems,
    callbacks.onExperimentSelect,
  );

  return {
    gallery,
    setTheme(theme: Theme) {
      themeToggleIcon.innerHTML = theme === "dark" ? uiIcon(ui.moon) : uiIcon(ui.sun);
    },
    setView,
    setRenderBadge(count: number) {
      renderBadge.textContent = String(count);
      renderBadge.classList.toggle("hidden", count <= 0);
    },
  };
}
