import {
  type ExperimentGallery,
  type GalleryItem,
  createExperimentGallery,
} from "./experiment-gallery";
import { ui, uiIcon } from "./icons";
import type { Theme } from "./theme";

export interface SidebarCallbacks {
  onExperimentSelect: (id: string) => void;
  onThemeToggle: () => void;
}

export interface Sidebar {
  gallery: ExperimentGallery;
  setTheme(theme: Theme): void;
}

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
    <div class="border-t border-line px-4 py-3 md:border-t-0 md:px-5">
      <h2 class="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-ink-subtle md:block">
        Experimentos
      </h2>
      <div id="gallery-container" class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0"></div>
    </div>
  `;

  const themeToggleBtn = container.querySelector<HTMLButtonElement>("#theme-toggle-btn");
  const themeToggleIcon = container.querySelector<HTMLSpanElement>("#theme-toggle-icon");
  const galleryContainer = container.querySelector<HTMLDivElement>("#gallery-container");
  if (!themeToggleBtn || !themeToggleIcon || !galleryContainer) {
    throw new Error("createSidebar: expected elements were not found after render");
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
  };
}
