export interface BackgroundPreset {
  id: string;
  label: string;
  kind: "solid" | "transparent";
  /** Hex color — only present for kind:"solid". */
  color?: string;
}

/**
 * The video's background — drives both the live preview (src/components/stage.ts)
 * and what gets exported (src/export/capture.ts). Deliberately just a flat
 * list so adding, removing, or restyling a background is a one-line change
 * here, nowhere else. The file format (mp4 vs webm) is *derived* from
 * `kind` at export time (src/main.ts) rather than chosen separately —
 * transparency can only exist in WebM, so there's no valid combination to
 * pick wrong.
 */
export const BACKGROUNDS: BackgroundPreset[] = [
  { id: "midnight", label: "Medianoche", kind: "solid", color: "#0a0a0f" },
  { id: "cream", label: "Crema", kind: "solid", color: "#f6f0e4" },
  { id: "emerald", label: "Esmeralda", kind: "solid", color: "#0d3b34" },
  { id: "transparent", label: "Transparente", kind: "transparent" },
];

export const DEFAULT_BACKGROUND_ID = "midnight";

export function getBackground(id: string): BackgroundPreset {
  return BACKGROUNDS.find((background) => background.id === id) ?? BACKGROUNDS[0];
}
