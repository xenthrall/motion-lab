import gsap from "gsap";
import { svgNode, viewBoxOf } from "./svg-node";

export interface FlashOptions {
  color?: string;
  /** Peak opacity. Below ~0.5 reads as a tint, above as a hit. */
  opacity?: number;
  duration?: number;
  /** Seconds to hold at peak before fading — for a siren, not an impact. */
  hold?: number;
}

/**
 * A full-frame colour flash: impacts, sirens, camera blowout.
 *
 * The rect is created once, when the experiment builds its timeline, and
 * just animated from transparent and back — never added/removed during
 * playback. That keeps scrubbing honest: the playhead can land anywhere and
 * the frame looks the same as it would during normal playback.
 *
 * Put it in a background layer to flash *behind* the mascot (a siren
 * lighting the room) or a foreground one to blow out the whole frame (an
 * explosion). See upsertSceneLayer's `behind` option.
 */
export function flash(layer: SVGGElement, options: FlashOptions = {}): gsap.core.Timeline {
  const { color = "#ffffff", opacity = 0.8, duration = 0.3, hold = 0 } = options;
  const view = viewBoxOf(layer);

  const rect = svgNode(layer, "rect", {
    x: view.x,
    y: view.y,
    width: view.width,
    height: view.height,
    fill: color,
    opacity: 0,
    "pointer-events": "none",
  });

  const tl = gsap.timeline();
  tl.to(rect, { opacity, duration: duration * 0.3, ease: "power2.out" });
  if (hold > 0) tl.to(rect, { opacity, duration: hold });
  tl.to(rect, { opacity: 0, duration: duration * 0.7, ease: "power2.in" });
  return tl;
}
