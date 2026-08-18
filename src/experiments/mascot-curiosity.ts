import { blink, eyesShift, idleBreathing, lean, settle, tilt, widenEyes } from "@/animations/moves";
import type { MascotParts } from "@/svg/utils/query-mascot";
import { upsertSceneProp } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * "Alive + curious" demo: the mascot breathes idly, a small object pops
 * into the scene (top-right corner), it notices — eyes widen and shift
 * toward it, head tilts, body leans in — bobs curiously for a moment,
 * blinks, then settles back to a neutral, breathing pose. Built entirely
 * from src/animations/moves; the object itself is a generic scene prop
 * (src/svg/utils/scene-props.ts), not part of the mascot SVG.
 */
export function createMascotCuriosityTimeline(parts: MascotParts): gsap.core.Timeline {
  const object = upsertSceneProp(parts.root, "curiosity-object", "circle", {
    cx: "152",
    cy: "18",
    r: "6",
    fill: "#facc15",
    opacity: "0",
  });

  const tl = gsap.timeline({ paused: true });

  // 1. Alive baseline, nothing has happened yet.
  tl.add(idleBreathing(parts, { repeat: 1, duration: 0.9, amount: 0.02 }));

  // 2. Something appears — this is what catches the mascot's attention.
  tl.to(
    object,
    { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.3, ease: "back.out(2)" },
    "+=0.15",
  );

  // 3. It notices: wide eyes, gaze + head tilt + lean toward the object.
  tl.add(widenEyes(parts, { scale: 1.2 }), "-=0.05");
  tl.add(eyesShift(parts, { x: 5, y: -3 }), "<");
  tl.add(tilt(parts, { angle: 9 }), "<");
  tl.add(lean(parts, { x: 6, y: -3 }), "<");

  // 4. Curious little bobs while staring; the object pulses back.
  tl.to(
    parts.mascot,
    { y: "-=3", duration: 0.3, repeat: 3, yoyo: true, ease: "sine.inOut" },
    "+=0.1",
  );
  tl.to(
    object,
    {
      scale: 1.2,
      transformOrigin: "50% 50%",
      duration: 0.3,
      repeat: 3,
      yoyo: true,
      ease: "sine.inOut",
    },
    "<",
  );

  // 5. A curious blink.
  tl.add(blink(parts, { times: 1, duration: 0.09 }), "+=0.1");

  // 6. Settle back to neutral; the object fades out.
  tl.add(settle(parts, { duration: 0.45 }), "+=0.1");
  tl.to(object, { opacity: 0, duration: 0.35 }, "<");

  return tl;
}
