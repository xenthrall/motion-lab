export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The coordinate space a node is drawing into, read from the SVG it lives
 * in. Anything that needs to reach the edge of the frame — a full-frame
 * flash, a projectile that has to start off-screen — must ask for this
 * rather than hardcoding numbers, because the frame is no longer fixed:
 * it changes with the chosen aspect ratio (see src/export/aspect-presets.ts).
 */
export function viewBoxOf(node: SVGElement): ViewBox {
  const svg = node.ownerSVGElement ?? (node as SVGSVGElement);
  const box = svg?.viewBox?.baseVal;
  if (!box || box.width === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

/** Convenience edges, so call sites read as intent instead of arithmetic. */
export function frameEdges(node: SVGElement): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
} {
  const box = viewBoxOf(node);
  return {
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
  };
}
