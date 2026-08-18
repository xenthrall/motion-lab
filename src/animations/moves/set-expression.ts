import type { ExpressionShapes } from "@/svg/mascot/expressions";
import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface SetExpressionOptions {
  /** Little emphasis pop on the eyes when the shape changes. Default true. */
  pop?: boolean;
  duration?: number;
}

/**
 * Swaps EYES/MOUTH to a different named shape (see
 * src/svg/mascot/expressions.ts) — an instant cut, not a morph. That's
 * deliberate: a sudden expression pop is a classic cartoon gag technique,
 * not something to hide.
 */
export function setExpression(
  parts: MascotParts,
  shapes: ExpressionShapes,
  options: SetExpressionOptions = {},
): gsap.core.Timeline {
  const { pop = true, duration = 0.18 } = options;
  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();

  tl.call(() => {
    parts.eyes.innerHTML = shapes.eyes;
    parts.mouth.innerHTML = shapes.mouth;
  });

  if (pop) {
    tl.fromTo(
      parts.eyes,
      { scale: 1.35 },
      { scale: 1, transformOrigin: "50% 50%", duration, ease: "back.out(3)" },
      "<",
    );
  }

  return tl;
}
