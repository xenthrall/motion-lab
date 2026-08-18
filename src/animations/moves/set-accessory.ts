import type { Accessory } from "@/svg/mascot/accessories";
import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

export interface SetAccessoryOptions {
  /** Drop it in from above instead of just appearing. Default true. */
  drop?: boolean;
  duration?: number;
  /** How far above the head it starts, in viewBox units. */
  from?: number;
}

/**
 * Puts something on (or takes it off) — swaps the `#EXTRA` group's markup,
 * see src/svg/mascot/accessories.ts.
 *
 * The accessory sibling of `setExpression`, and it works the same way: a
 * content swap, not a morph. The optional drop-in exists because "gearing
 * up" is a beat in itself — glasses that slide down into place land the
 * moment far better than glasses that are simply there on the next frame.
 *
 * Note it clears `#EXTRA`'s transform after a drop, so a later move that
 * touches the group starts from a clean slate.
 */
export function setAccessory(
  parts: MascotParts,
  accessory: Accessory,
  options: SetAccessoryOptions = {},
): gsap.core.Timeline {
  const { drop = true, duration = 0.32, from = 26 } = options;

  // Not paused — see the comment in entrance.ts / src/animations/README.md.
  const tl = gsap.timeline();

  tl.call(() => {
    parts.extra.innerHTML = accessory.markup;
  });

  if (drop && accessory.markup !== "") {
    tl.fromTo(
      parts.extra,
      { y: -from, opacity: 0 },
      // immediateRender:false, or building the timeline would immediately
      // park #EXTRA off-position and invisible — see src/animations/effects/index.ts.
      { y: 0, opacity: 1, duration, ease: "back.out(2.2)", immediateRender: false },
      "<",
    );
  }

  return tl;
}
