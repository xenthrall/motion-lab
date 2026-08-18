const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Creates (or replaces) a standalone SVG element in the same coordinate
 * space as the mascot, for experiments that need something in the scene
 * besides the mascot itself (e.g. an object it reacts to). Idempotent: if
 * a prop with the same id already exists under `root`, it's removed first
 * — safe to call every time an experiment is (re)created. Keeps scene
 * props out of the mascot's own SVG file, so the asset stays decoupled
 * from any one experiment.
 */
export function upsertSceneProp<K extends keyof SVGElementTagNameMap>(
  root: SVGSVGElement,
  id: string,
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  root.querySelector(`[data-scene-prop="${id}"]`)?.remove();

  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  el.dataset.sceneProp = id;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  root.appendChild(el);
  return el;
}

/**
 * Same idea as `upsertSceneProp`, but for a compound object made of
 * several shapes (a `<g>` with arbitrary inner markup) instead of a
 * single element — e.g. a hand-drawn bug, rocket, or lightbulb built
 * from a handful of primitives. `innerSvg` is trusted markup authored in
 * this codebase, never user input.
 */
export function upsertSceneGroup(root: SVGSVGElement, id: string, innerSvg: string): SVGGElement {
  root.querySelector(`[data-scene-prop="${id}"]`)?.remove();

  const g = document.createElementNS(SVG_NS, "g") as SVGGElement;
  g.dataset.sceneProp = id;
  g.innerHTML = innerSvg;
  root.appendChild(g);
  return g;
}

/**
 * An empty group to mount a whole scene into, instead of appending props
 * one by one to the root.
 *
 * Two reasons it exists. **Depth:** props appended to the root always draw
 * *over* the mascot; `behind: true` inserts the layer before `#MASCOT`, so
 * an experiment can have a background (flashes, speed lines) and a
 * foreground (explosions, projectiles). **Camera moves:** with every prop
 * inside one group, a single tween on the group moves/shakes the entire
 * scene at once, without fighting the per-prop tweens that the story is
 * already running (each animates its own transform).
 */
export function upsertSceneLayer(
  root: SVGSVGElement,
  id: string,
  options: { behind?: boolean } = {},
): SVGGElement {
  root.querySelector(`[data-scene-prop="${id}"]`)?.remove();

  const layer = document.createElementNS(SVG_NS, "g") as SVGGElement;
  layer.dataset.sceneProp = id;

  const mascot = root.querySelector("#MASCOT");
  if (options.behind && mascot) {
    root.insertBefore(layer, mascot);
  } else {
    root.appendChild(layer);
  }
  return layer;
}

/**
 * Adds one shape group inside a layer. Not marked with `data-scene-prop`
 * itself — it doesn't need to be, since clearing the layer takes its
 * children with it.
 */
export function appendSceneShape(layer: SVGGElement, innerSvg: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, "g") as SVGGElement;
  g.innerHTML = innerSvg;
  layer.appendChild(g);
  return g;
}

/** Removes every scene prop under `root` — call before switching experiments. */
export function clearSceneProps(root: SVGSVGElement): void {
  for (const el of root.querySelectorAll("[data-scene-prop]")) {
    el.remove();
  }
}
