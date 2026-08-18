import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface SpinOptions {
  rotations?: number;
  duration?: number;
}

/** A full-body triumphant spin — relative rotation, so it works from whatever angle the mascot is currently at. */
export function spin(parts: MascotParts, options: SpinOptions = {}): gsap.core.Timeline {
  const { rotations = 1, duration = 0.6 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, {
    rotation: `+=${360 * rotations}`,
    transformOrigin: "50% 50%",
    duration,
    ease: "power1.inOut",
  });
  return tl;
}
