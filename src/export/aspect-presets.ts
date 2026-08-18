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

/**
 * The mascot's natural framing — the viewBox `tequia-base.svg` ships with,
 * expressed as a centre plus a size. Everything below grows *outward* from
 * this box, never inward, so the mascot is never smaller than it is here.
 */
const BASE_FRAME = { centerX: 90, centerY: 65, width: 160, height: 130 };

export interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The viewBox to give the mascot's SVG for a given output format.
 *
 * The asset's own viewBox is 160x130, which is tight around the mascot and
 * has two consequences we don't want: anything an animation moves outside
 * it gets **clipped** (projectiles entering, a title card scaled up, camera
 * shake pushing the scene sideways), and rendering it into, say, 9:16 has
 * to letterbox — dead bars top and bottom, and a frame that doesn't match
 * what was composed.
 *
 * So the frame is derived from the target format instead: keep the base box
 * fully inside it, grow the axis that needs it until the aspect matches
 * exactly, and centre on the mascot. Now the SVG fills the output edge to
 * edge (no bars, no letterboxing at all — the letterbox maths in
 * rasterize.ts becomes a no-op), and the extra room is *usable*: it's where
 * the action happens instead of being cropped away.
 *
 * The trade-off, stated plainly: a tall format gives the mascot a smaller
 * share of the frame than a square one, because the room has to come from
 * somewhere. That's the intent — the alternative is cropping the animation.
 */
export function getAspectViewBox(preset: AspectPreset): ViewBoxRect {
  const targetRatio = preset.width / preset.height;
  const baseRatio = BASE_FRAME.width / BASE_FRAME.height;

  const width = targetRatio >= baseRatio ? BASE_FRAME.height * targetRatio : BASE_FRAME.width;
  const height = targetRatio >= baseRatio ? BASE_FRAME.height : BASE_FRAME.width / targetRatio;

  return {
    x: BASE_FRAME.centerX - width / 2,
    y: BASE_FRAME.centerY - height / 2,
    width,
    height,
  };
}

/** The same thing as an SVG `viewBox` attribute value. */
export function aspectViewBoxAttribute(preset: AspectPreset): string {
  const box = getAspectViewBox(preset);
  const round = (value: number) => Math.round(value * 100) / 100;
  return `${round(box.x)} ${round(box.y)} ${round(box.width)} ${round(box.height)}`;
}
