import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface AnticipateOptions {
  /** How deep the crouch is. 0.85 is a normal wind-up, 0.7 a big one. */
  squash?: number;
  duration?: number;
}

/**
 * The wind-up before an action: crouch down, hold, ready to go.
 *
 * Pure animation-principle plumbing — anticipation is what makes the move
 * that follows read as *powerful* rather than abrupt. Compose it right
 * before a `dash`, `bounce` or `spin`; it leaves the mascot squashed, and
 * the move that follows snaps it back out.
 */
export function anticipate(
  parts: MascotParts,
  options: AnticipateOptions = {},
): gsap.core.Timeline {
  const { squash = 0.85, duration = 0.28 } = options;

  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  tl.to(parts.mascot, {
    scaleY: squash,
    // Widen as it flattens: keeping volume roughly constant is what sells
    // squash as a body compressing rather than an image being scaled.
    scaleX: 2 - squash,
    y: (1 - squash) * 24,
    transformOrigin: "50% 100%",
    duration,
    ease: "power2.out",
  });
  return tl;
}
