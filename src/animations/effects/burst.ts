import gsap from "gsap";
import { createRandom, svgNode } from "./svg-node";

export interface BurstOptions {
  x: number;
  y: number;
  count?: number;
  /** How far the farthest particle travels, in viewBox units. */
  distance?: number;
  duration?: number;
  colors?: string[];
  size?: number;
  /** Downward pull applied at the end — 0 for sparks, >0 for confetti. */
  gravity?: number;
  /** Restrict the spray to an arc, in degrees (360 = all directions). */
  spread?: number;
  /** Direction the arc points, in degrees (0 = right, -90 = up). */
  angle?: number;
  /** Changes the scatter without changing the look. See createRandom. */
  seed?: number;
}

/**
 * A particle burst: explosions, sparks, confetti.
 *
 * All particles are created up front and parked invisible, then flung
 * outward and faded — nothing is added to or removed from the DOM while the
 * timeline runs, so seeking to any point renders correctly (the same reason
 * flash() works the way it does).
 *
 * Squares rather than circles on purpose: at this scale they read as
 * pixel-art debris, which matches the mascot's own blocky silhouette.
 */
export function burst(layer: SVGGElement, options: BurstOptions): gsap.core.Timeline {
  const {
    x,
    y,
    count = 14,
    distance = 34,
    duration = 0.7,
    colors = ["#c4b5fd", "#facc15", "#a78bfa"],
    size = 3.5,
    gravity = 0,
    spread = 360,
    angle = 0,
    seed = 1,
  } = options;

  const random = createRandom(seed);
  const tl = gsap.timeline();

  for (let index = 0; index < count; index += 1) {
    const side = size * (0.6 + random() * 0.8);
    const particle = svgNode(layer, "rect", {
      x: x - side / 2,
      y: y - side / 2,
      width: side,
      height: side,
      rx: side * 0.25,
      fill: colors[index % colors.length],
      opacity: 0,
      "pointer-events": "none",
    });
    gsap.set(particle, { transformOrigin: "50% 50%" });

    // Spread evenly around the arc, then jitter — evenly-spaced-plus-noise
    // looks scattered, while pure randomness clumps and leaves gaps.
    const base = angle - spread / 2 + (spread * (index + random())) / count;
    const radians = (base * Math.PI) / 180;
    const reach = distance * (0.45 + random() * 0.55);

    tl.fromTo(
      particle,
      { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0 },
      {
        x: Math.cos(radians) * reach,
        y: Math.sin(radians) * reach + gravity,
        rotation: (random() * 2 - 1) * 220,
        scale: 0.2,
        opacity: 0,
        duration: duration * (0.7 + random() * 0.5),
        ease: gravity > 0 ? "power1.out" : "power2.out",
        // See the immediateRender note in ./index.ts — without this every
        // particle would sit visible on screen from the first frame.
        immediateRender: false,
      },
      random() * 0.06,
    );
  }

  return tl;
}
