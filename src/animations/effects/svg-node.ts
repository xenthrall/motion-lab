export const SVG_NS = "http://www.w3.org/2000/svg";

/** Creates an SVG element with attributes and appends it. Effects build
 * their own shapes rather than asking the caller for markup, so a call
 * site stays one line. */
export function svgNode<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  parent.appendChild(el);
  return el;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The coordinate space an effect is drawing into, read from the SVG it
 * lives in — so a full-frame flash covers the frame whatever the mascot's
 * viewBox happens to be, instead of hardcoding today's numbers. */
export function viewBoxOf(node: SVGElement): ViewBox {
  const svg = node.ownerSVGElement;
  const box = svg?.viewBox.baseVal;
  if (!box || box.width === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

/**
 * Deterministic pseudo-random (mulberry32).
 *
 * `Math.random()` would make every rebuild of an experiment scatter its
 * particles differently — fine on screen, wrong for a lab whose whole
 * offline renderer exists to be deterministic. With a seed, the same
 * experiment renders identically today and next month, and two renders of
 * the same clip can be compared frame by frame.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
