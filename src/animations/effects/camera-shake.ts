import gsap from "gsap";
import { createRandom } from "./svg-node";

export interface CameraShakeOptions {
  /** Peak offset in viewBox units. 2-3 is a thud, 6+ is an earthquake. */
  intensity?: number;
  cycles?: number;
  duration?: number;
  seed?: number;
}

/**
 * Shakes whatever it's given as if the camera had been hit.
 *
 * Unlike everything in `moves/`, this doesn't take `MascotParts` — it takes
 * raw targets, because a camera shake is precisely the effect that has to
 * move *everything at once*: the scene layers and the mascot together. Pass
 * them as one array so they share the same offsets; shaking them separately
 * would look like objects rattling independently, not like a camera.
 *
 * The amplitude decays and the last step returns to 0, so the shake settles
 * instead of stopping dead.
 *
 * ⚠️ It animates `x`/`y` on its targets, so don't run it over a move that's
 * driving the mascot's own x/y at that moment (lean, dash) — the two would
 * fight and the shake would win, snapping the pose. Shake from a settled
 * pose, which is also when an impact reads best.
 */
export function cameraShake(
  targets: gsap.TweenTarget,
  options: CameraShakeOptions = {},
): gsap.core.Timeline {
  const { intensity = 3, cycles = 7, duration = 0.45, seed = 3 } = options;

  const random = createRandom(seed);
  const tl = gsap.timeline();
  const step = duration / (cycles + 1);

  for (let index = 0; index < cycles; index += 1) {
    const decay = 1 - index / cycles;
    tl.to(targets, {
      x: (random() * 2 - 1) * intensity * decay,
      y: (random() * 2 - 1) * intensity * decay,
      duration: step,
      ease: "none",
    });
  }

  tl.to(targets, { x: 0, y: 0, duration: step, ease: "power2.out" });
  return tl;
}
