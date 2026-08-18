import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface SettleOptions {
  duration?: number;
}

/** Returns the mascot to its neutral resting pose (position, rotation, eye offset/scale). */
export function settle(parts: MascotParts, options: SettleOptions = {}): gsap.core.Timeline {
  const { duration = 0.4 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, { x: 0, y: 0, rotation: 0, scale: 1, duration, ease: "power2.inOut" }, 0);
  tl.to(parts.eyes, { x: 0, y: 0, scale: 1, duration, ease: "power2.inOut" }, 0);
  return tl;
}
