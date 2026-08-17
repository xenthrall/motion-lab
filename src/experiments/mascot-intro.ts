import { blink, bounce, entrance, idleBreathing } from "@/animations/moves";
import type { MascotParts } from "@/svg/utils/query-mascot";
import gsap from "gsap";

/**
 * First composed demo, built entirely from src/animations/moves: entrance
 * -> idle breathing -> double blink -> bounce. Proves the kit end-to-end
 * on the real Tequia mascot.
 */
export function createMascotIntroTimeline(parts: MascotParts): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });

  tl.add(entrance(parts, { duration: 0.6 }));
  tl.add(idleBreathing(parts, { repeat: 2, duration: 0.5, amount: 0.025 }), ">");
  tl.add(blink(parts, { times: 2 }), "+=0.3");
  tl.add(bounce(parts, { height: 16 }), "+=0.2");

  return tl;
}
