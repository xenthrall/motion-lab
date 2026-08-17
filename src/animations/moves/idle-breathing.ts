import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface IdleBreathingOptions {
  /** Number of yoyo cycles. Use -1 for an infinite loop (not export-safe). */
  repeat?: number;
  duration?: number;
  amount?: number;
}

/** Subtle whole-body scale breathing loop, to make the mascot feel alive. */
export function idleBreathing(
  parts: MascotParts,
  options: IdleBreathingOptions = {},
): gsap.core.Timeline {
  const { repeat = 1, duration = 1.1, amount = 0.03 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, {
    scale: 1 + amount,
    transformOrigin: "50% 50%",
    duration,
    ease: "sine.inOut",
    repeat,
    yoyo: true,
  });
  return tl;
}
