import { brand, ui } from "./icons";

/**
 * Purely presentational: shape + representative platform icon per aspect
 * preset. Kept out of src/export/aspect-presets.ts so that module stays
 * plain export data (id/ratio/resolution), reusable outside the UI.
 */
export const ASPECT_ICONS: Record<string, { shape: string; brand: string }> = {
  square: { shape: ui.square, brand: brand.instagram },
  portrait: { shape: ui.rectangleVertical, brand: brand.instagram },
  vertical: { shape: ui.rectangleVertical, brand: brand.tiktok },
  landscape: { shape: ui.rectangleHorizontal, brand: brand.youtube },
};
