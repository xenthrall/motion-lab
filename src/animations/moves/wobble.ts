import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface WobbleOptions {
  cycles?: number;
  duration?: number;
  angle?: number;
}

/** A jittery side-to-side wobble — comedic "dizzy" beat, meant to pair with the "dizzy" expression. */
export function wobble(parts: MascotParts, options: WobbleOptions = {}): gsap.core.Timeline {
  const { cycles = 4, duration = 0.16, angle = 9 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(
    parts.mascot,
    {
      rotation: angle,
      x: "+=3",
      transformOrigin: "50% 100%",
      duration,
      ease: "sine.inOut",
      repeat: cycles * 2 - 1,
      yoyo: true,
    },
    0,
  );
  return tl;
}
