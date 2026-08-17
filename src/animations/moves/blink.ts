import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface BlinkOptions {
  times?: number;
  duration?: number;
  gap?: number;
}

/** Quick vertical squash of the EYES group to simulate a blink. */
export function blink(parts: MascotParts, options: BlinkOptions = {}): gsap.core.Timeline {
  const { times = 1, duration = 0.12, gap = 0.15 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();

  for (let i = 0; i < times; i++) {
    tl.to(parts.eyes, {
      scaleY: 0.1,
      transformOrigin: "50% 50%",
      duration,
      ease: "power1.in",
    }).to(parts.eyes, {
      scaleY: 1,
      duration,
      ease: "power1.out",
    });

    if (i < times - 1) {
      tl.to({}, { duration: gap });
    }
  }

  return tl;
}
