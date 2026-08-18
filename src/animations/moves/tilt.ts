import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface TiltOptions {
  angle?: number;
  duration?: number;
}

/** Quizzical whole-body head tilt — classic "curious" body language. */
export function tilt(parts: MascotParts, options: TiltOptions = {}): gsap.core.Timeline {
  const { angle = 10, duration = 0.4 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, {
    rotation: angle,
    transformOrigin: "50% 100%",
    duration,
    ease: "back.out(2)",
  });
  return tl;
}
