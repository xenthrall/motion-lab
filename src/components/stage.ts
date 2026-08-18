import { type AspectPreset, DEFAULT_ASPECT_ID, getAspectPreset } from "@/export/aspect-presets";
import { mountInlineSvg } from "@/svg/utils/inline-svg";
import { type MascotParts, queryMascotParts } from "@/svg/utils/query-mascot";

export interface Stage {
  /** The aspect-ratio-constrained frame — visually what gets exported. */
  frame: HTMLDivElement;
  svg: SVGSVGElement;
  parts: MascotParts;
  setAspect(preset: AspectPreset): void;
}

const FRAME_CLASS =
  "relative mx-auto flex w-full max-w-sm max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-muted shadow-inner sm:max-w-md";

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

  setAspect(getAspectPreset(DEFAULT_ASPECT_ID));

  return { frame, svg, parts, setAspect };
}
