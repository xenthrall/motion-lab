import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface EyesShiftOptions {
  x?: number;
  y?: number;
  duration?: number;
}

/** Shifts the EYES group toward a direction, simulating a gaze/look. */
export function eyesShift(parts: MascotParts, options: EyesShiftOptions = {}): gsap.core.Timeline {
  const { x = 4, y = -2, duration = 0.25 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.eyes, { x, y, duration, ease: "power2.out" });
  return tl;
}
