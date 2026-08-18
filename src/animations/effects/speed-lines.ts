import gsap from "gsap";
import { createRandom, svgNode, viewBoxOf } from "./svg-node";

export interface SpeedLinesOptions {
  count?: number;
  duration?: number;
  /** Which way the lines travel. */
  direction?: "left" | "right";
  color?: string;
  /** 0..1 — how much of the frame height the lines occupy, centred. */
  coverage?: number;
  opacity?: number;
  seed?: number;
}

/**
 * Horizontal streaks whipping across the frame — the classic "this is fast
 * / this is intense" cue from action animation.
 *
 * Behind the mascot they read as air rushing past; in front, as the frame
 * itself whipping by (the classic anime look). Which one works depends on
 * how much of the frame the character occupies — this mascot fills most of
 * it, so background lines only show as slivers at the edges, and the
 * foreground reads better for the big beats.
 */
export function speedLines(
  layer: SVGGElement,
  options: SpeedLinesOptions = {},
): gsap.core.Timeline {
  const {
    count = 9,
    duration = 0.5,
    direction = "left",
    color = "#c4b5fd",
    coverage = 0.8,
    opacity = 0.55,
    seed = 7,
  } = options;

  const view = viewBoxOf(layer);
  const random = createRandom(seed);
  const travel = view.width * 1.4;
  const sign = direction === "left" ? -1 : 1;

  const tl = gsap.timeline();

  for (let index = 0; index < count; index += 1) {
    const length = view.width * (0.12 + random() * 0.22);
    // Spread across the covered band by index, jittered — same
    // even-plus-noise trick as burst(), for the same reason.
    const band = view.height * coverage;
    const top = view.y + (view.height - band) / 2;
    const y = top + (band * (index + random() * 0.8)) / count;
    const startX = direction === "left" ? view.x + view.width : view.x - length;

    const line = svgNode(layer, "rect", {
      x: startX,
      y,
      width: length,
      height: 1 + random() * 1.6,
      rx: 1,
      fill: color,
      opacity: 0,
      "pointer-events": "none",
    });

    tl.fromTo(
      line,
      { x: 0, opacity: 0 },
      {
        x: sign * travel,
        opacity,
        duration: duration * (0.55 + random() * 0.4),
        ease: "power1.in",
        // See the immediateRender note in ./index.ts.
        immediateRender: false,
      },
      random() * duration * 0.5,
    ).to(line, { opacity: 0, duration: 0.12 }, "<70%");
  }

  return tl;
}
