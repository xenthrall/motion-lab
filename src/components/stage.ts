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

export function createStage(container: Element, svgMarkup: string): Stage {
  const frame = document.createElement("div");
  frame.className = "stage-frame";

  const svgHolder = document.createElement("div");
  svgHolder.className = "stage-frame__svg";
  frame.appendChild(svgHolder);

  container.appendChild(frame);

  const svg = mountInlineSvg(svgHolder, svgMarkup);
  const parts = queryMascotParts(svg);

  const setAspect = (preset: AspectPreset) => {
    frame.style.aspectRatio = String(preset.ratio);
  };

  setAspect(getAspectPreset(DEFAULT_ASPECT_ID));

  return { frame, svg, parts, setAspect };
}
