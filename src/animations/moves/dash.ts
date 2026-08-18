import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface DashOptions {
  x?: number;
  y?: number;
  duration?: number;
  /** Peak stretch along the direction of travel. 1 disables it. */
  stretch?: number;
  /** Come back to where it started instead of staying put. Default true. */
  returnBack?: boolean;
}

/**
 * A fast lunge — dodging, charging, snapping aside.
 *
 * Where `lean` is a slow "I'm interested" shift, this is the action-beat
 * version: it stretches along the direction of travel on the way out and
 * squashes back on arrival, the standard cartoon read for speed. Without
 * that deformation a fast translate just looks like the drawing teleported.
 */
export function dash(parts: MascotParts, options: DashOptions = {}): gsap.core.Timeline {
  const { x = 18, y = 0, duration = 0.24, stretch = 1.18, returnBack = true } = options;

  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();
  // Stretch on the axis actually being travelled, so a vertical dash
  // elongates vertically rather than sideways.
  const horizontal = Math.abs(x) >= Math.abs(y);
  const stretched = horizontal
    ? { scaleX: stretch, scaleY: 2 - stretch }
    : { scaleY: stretch, scaleX: 2 - stretch };

  tl.to(parts.mascot, {
    x,
    y,
    ...stretched,
    transformOrigin: "50% 50%",
    duration: duration * 0.55,
    ease: "power3.out",
  });
  tl.to(parts.mascot, {
    scaleX: 1,
    scaleY: 1,
    duration: duration * 0.45,
    ease: "back.out(2)",
  });

  if (returnBack) {
    tl.to(parts.mascot, { x: 0, y: 0, duration: duration * 0.8, ease: "power2.inOut" });
  }

  return tl;
}
