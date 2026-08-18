import gsap from "gsap";
import { svgNode } from "./svg-node";

export interface ShockwaveOptions {
  x: number;
  y: number;
  from?: number;
  to?: number;
  duration?: number;
  color?: string;
  width?: number;
  /** How many rings, each starting slightly later — 2-3 reads as a bigger hit. */
  rings?: number;
}

/**
 * Expanding ring(s) from a point — the "something just landed here" cue.
 *
 * The stroke thins as the ring grows (a constant stroke on a big circle
 * looks like a drawn shape, not an expanding wave), and opacity fades so
 * the ring dissolves instead of stopping.
 */
export function shockwave(layer: SVGGElement, options: ShockwaveOptions): gsap.core.Timeline {
  const {
    x,
    y,
    from = 2,
    to = 46,
    duration = 0.5,
    color = "#c4b5fd",
    width = 4,
    rings = 1,
  } = options;

  const tl = gsap.timeline();

  for (let index = 0; index < rings; index += 1) {
    const circle = svgNode(layer, "circle", {
      cx: x,
      cy: y,
      r: from,
      fill: "none",
      stroke: color,
      "stroke-width": width,
      opacity: 0,
      "pointer-events": "none",
    });

    // Each extra ring is a bit smaller and a beat later, so they read as one
    // event with depth rather than as three separate ones.
    const scale = 1 - index * 0.22;
    tl.fromTo(
      circle,
      { attr: { r: from }, opacity: 0.9, strokeWidth: width },
      {
        attr: { r: to * scale },
        opacity: 0,
        strokeWidth: width * 0.2,
        duration,
        ease: "power2.out",
        // See the immediateRender note in ./index.ts.
        immediateRender: false,
      },
      index * (duration * 0.18),
    );
  }

  return tl;
}
