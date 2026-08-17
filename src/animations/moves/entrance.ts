import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface EntranceOptions {
  duration?: number;
}

/** Pop-in entrance: scales and fades the whole mascot in from nothing. */
export function entrance(parts: MascotParts, options: EntranceOptions = {}): gsap.core.Timeline {
  const { duration = 0.6 } = options;
  // Not paused: a nested timeline created with paused:true contributes ZERO
  // duration to whatever parent .add()s it (a real GSAP gotcha). Since the
  // caller always nests this synchronously before the next tick, it never
  // gets a chance to play on its own — see src/animations/README.md.
  const tl = gsap.timeline();
  tl.from(parts.mascot, {
    scale: 0,
    opacity: 0,
    transformOrigin: "50% 50%",
    duration,
    ease: "back.out(1.7)",
  });
  return tl;
}
