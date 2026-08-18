/**
 * Scene effects — the counterpart to `moves/`.
 *
 * A **move** animates the mascot (`MascotParts`). An **effect** animates the
 * *scene around it*: flashes, shockwaves, particles, speed lines, camera
 * shake. They're separate because they answer to different owners — a move
 * may only touch HEAD/EYES/MOUTH/EXTRA/MASCOT, while an effect draws its own
 * throwaway shapes into a scene layer (`upsertSceneLayer`) and never touches
 * the mascot at all. Keeping the split means a move can never accidentally
 * depend on scenery, and an effect works for any future character.
 *
 * Shared rules, same spirit as the moves kit:
 *
 * - Signature is `(layer, options) => gsap.core.Timeline`, never paused
 *   (see the nested-paused-timeline gotcha in ../README.md).
 * - Every shape an effect needs is created **when the timeline is built**,
 *   not while it plays, and is left invisible when idle. Creating elements
 *   mid-playback would make a scrub land on a frame that never existed.
 * - ⚠️ Every `fromTo` here passes **`immediateRender: false`**. GSAP applies
 *   a `fromTo`'s "from" values the moment the tween is *created*, not when
 *   it runs — so without this, building an experiment would paint every
 *   particle, ring and speed line onto frame 0 at once. Found exactly that
 *   way: the first render of mascot-rescue had stray squares stuck on the
 *   mascot's face for the whole clip. The moves kit gets away with it
 *   because main.ts's `resetVisualState()` wipes the mascot's inline styles
 *   after building a timeline; scene shapes have no such safety net.
 * - Randomness is seeded (`createRandom`), so a render is reproducible —
 *   this lab's whole offline renderer exists to be deterministic.
 * - Nothing needs manual cleanup: the shapes live inside the layer, and
 *   `clearSceneProps` removes it when the experiment changes.
 */

export { burst } from "./burst";
export type { BurstOptions } from "./burst";

export { cameraShake } from "./camera-shake";
export type { CameraShakeOptions } from "./camera-shake";

export { flash } from "./flash";
export type { FlashOptions } from "./flash";

export { shockwave } from "./shockwave";
export type { ShockwaveOptions } from "./shockwave";

export { speedLines } from "./speed-lines";
export type { SpeedLinesOptions } from "./speed-lines";

export { createRandom } from "./svg-node";
