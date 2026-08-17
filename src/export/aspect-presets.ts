export interface AspectPreset {
  id: string;
  label: string;
  ratio: number;
  width: number;
  height: number;
}

/** Common social formats. width/height are the export resolution in px. */
export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "square", label: "1:1 · Feed", ratio: 1, width: 1080, height: 1080 },
  { id: "portrait", label: "4:5 · Feed vertical", ratio: 4 / 5, width: 1080, height: 1350 },
  {
    id: "vertical",
    label: "9:16 · Reels / Stories / TikTok",
    ratio: 9 / 16,
    width: 1080,
    height: 1920,
  },
  {
    id: "landscape",
    label: "16:9 · YouTube / horizontal",
    ratio: 16 / 9,
    width: 1920,
    height: 1080,
  },
];

export const DEFAULT_ASPECT_ID = "square";

export function getAspectPreset(id: string): AspectPreset {
  return ASPECT_PRESETS.find((preset) => preset.id === id) ?? ASPECT_PRESETS[0];
}
