import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface WidenEyesOptions {
  scale?: number;
  duration?: number;
}

/** Briefly scales the EYES up — a surprise/curiosity "wide eyes" beat. */
export function widenEyes(parts: MascotParts, options: WidenEyesOptions = {}): gsap.core.Timeline {
  const { scale = 1.25, duration = 0.2 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.eyes, { scale, transformOrigin: "50% 50%", duration, ease: "back.out(3)" });
  return tl;
}
