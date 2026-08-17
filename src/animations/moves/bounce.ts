import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface BounceOptions {
  height?: number;
  duration?: number;
}

/** Vertical bounce with squash/stretch on takeoff and landing, whole-body. */
export function bounce(parts: MascotParts, options: BounceOptions = {}): gsap.core.Timeline {
  const { height = 18, duration = 0.45 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();

  tl.to(parts.mascot, {
    y: -height,
    scaleX: 0.96,
    scaleY: 1.05,
    transformOrigin: "50% 100%",
    duration: duration * 0.45,
    ease: "power2.out",
  })
    .to(parts.mascot, {
      y: 0,
      scaleX: 1.08,
      scaleY: 0.9,
      duration: duration * 0.35,
      ease: "power2.in",
    })
    .to(parts.mascot, {
      scaleX: 1,
      scaleY: 1,
      duration: duration * 0.2,
      ease: "power1.out",
    });

  return tl;
}
