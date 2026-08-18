import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface LeanOptions {
  x?: number;
  y?: number;
  duration?: number;
}

/** Leans the whole body toward a point in the scene — an "I'm interested" shift. */
export function lean(parts: MascotParts, options: LeanOptions = {}): gsap.core.Timeline {
  const { x = 8, y = -3, duration = 0.5 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, { x, y, duration, ease: "sine.out" });
  return tl;
}
