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

/** Removes every scene prop under `root` — call before switching experiments. */
export function clearSceneProps(root: SVGSVGElement): void {
  for (const el of root.querySelectorAll("[data-scene-prop]")) {
    el.remove();
  }
}
