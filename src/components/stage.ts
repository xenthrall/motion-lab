import {
  type AspectPreset,
  DEFAULT_ASPECT_ID,
  aspectViewBoxAttribute,
  getAspectPreset,
} from "@/export/aspect-presets";
import { type BackgroundPreset, DEFAULT_BACKGROUND_ID, getBackground } from "@/export/backgrounds";
import { mountInlineSvg } from "@/svg/utils/inline-svg";
import { type MascotParts, queryMascotParts } from "@/svg/utils/query-mascot";

export interface Stage {
  /** The aspect-ratio-constrained frame — visually what gets exported. */
  frame: HTMLDivElement;
  svg: SVGSVGElement;
  parts: MascotParts;
  setAspect(preset: AspectPreset): void;
  setBackground(preset: BackgroundPreset): void;
}

// The frame is sized by the space it's given, not by a fixed max-width:
// `h-full w-auto` + max-* + an aspect-ratio makes it grow to the largest
// box of that ratio that fits its container. The preview is meant to use
// the whole panel — a small centred card wastes most of the screen and
// makes it impossible to judge an animation.
const FRAME_CLASS =
  "relative mx-auto flex h-full max-h-full w-auto max-w-full items-center justify-center overflow-hidden rounded-2xl border border-line shadow-inner";

// Same checkerboard recipe as the transparency swatch icon, just tiled
// bigger so it reads clearly at stage size instead of icon size.
const TRANSPARENT_BACKGROUND_STYLE = {
  backgroundImage:
    "conic-gradient(#8b8b8b 90deg, transparent 90deg 180deg, #8b8b8b 180deg 270deg, transparent 270deg)",
  backgroundSize: "20px 20px",
};

export function createStage(container: Element, svgMarkup: string): Stage {
  const frame = document.createElement("div");
  frame.className = FRAME_CLASS;

  // Fills the frame edge to edge. It used to be a 58%-wide box centred in
  // the frame, which left margins the animation could never reach and
  // clipped anything that moved into them.
  const svgHolder = document.createElement("div");
  svgHolder.className = "h-full w-full";
  frame.appendChild(svgHolder);

  container.appendChild(frame);

  const svg = mountInlineSvg(svgHolder, svgMarkup);
  svg.classList.add("block", "h-full", "w-full");
  const parts = queryMascotParts(svg);

  const setAspect = (preset: AspectPreset) => {
    frame.style.aspectRatio = String(preset.ratio);
    // The viewBox follows the format, so the drawing area *is* the output
    // frame: no letterbox bars, and the extra room becomes usable stage
    // instead of being cropped. See getAspectViewBox for the reasoning.
    svg.setAttribute("viewBox", aspectViewBoxAttribute(preset));
  };

  const setBackground = (preset: BackgroundPreset) => {
    if (preset.kind === "transparent") {
      frame.style.backgroundColor = "";
      frame.style.backgroundImage = TRANSPARENT_BACKGROUND_STYLE.backgroundImage;
      frame.style.backgroundSize = TRANSPARENT_BACKGROUND_STYLE.backgroundSize;
    } else {
      frame.style.backgroundImage = "";
      frame.style.backgroundColor = preset.color ?? "";
    }
  };

  setAspect(getAspectPreset(DEFAULT_ASPECT_ID));
  setBackground(getBackground(DEFAULT_BACKGROUND_ID));

  return { frame, svg, parts, setAspect, setBackground };
}
