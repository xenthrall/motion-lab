import { type AspectPreset, DEFAULT_ASPECT_ID, getAspectPreset } from "@/export/aspect-presets";
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

const FRAME_CLASS =
  "relative mx-auto flex w-full max-w-sm max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-line shadow-inner sm:max-w-md";

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

  const svgHolder = document.createElement("div");
  svgHolder.className = "w-[58%]";
  frame.appendChild(svgHolder);

  container.appendChild(frame);

  const svg = mountInlineSvg(svgHolder, svgMarkup);
  svg.classList.add("block", "w-full", "h-auto");
  const parts = queryMascotParts(svg);

  const setAspect = (preset: AspectPreset) => {
    frame.style.aspectRatio = String(preset.ratio);
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
