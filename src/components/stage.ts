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
  "relative mx-auto flex w-full max-w-xs max-h-[70vh] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black shadow-2xl shadow-black/40 sm:max-w-sm";

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
