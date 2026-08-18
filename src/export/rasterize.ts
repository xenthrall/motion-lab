export interface RasterizeOptions {
  width: number;
  height: number;
  transparent: boolean;
  backgroundColor: string;
}

/**
 * Draws the SVG's *current* state onto `ctx`, letterboxed to fit
 * width x height. Shared by the live real-time exporter (capture.ts,
 * called every requestAnimationFrame) and the offline frame-by-frame
 * renderer (scripts/render.mjs, called once per stepped frame via the
 * dev-only window.__lab hook) — one implementation of "how do we turn
 * the mascot's current DOM state into pixels", reused by both.
 */
export function rasterizeSvgToCanvas(
  svg: SVGSVGElement,
  ctx: CanvasRenderingContext2D,
  options: RasterizeOptions,
): Promise<void> {
  const { width, height, transparent, backgroundColor } = options;
  const svgWidth = svg.viewBox.baseVal.width || svg.clientWidth;
  const svgHeight = svg.viewBox.baseVal.height || svg.clientHeight;
  const scale = Math.min(width / svgWidth, height / svgHeight);
  const drawWidth = svgWidth * scale;
  const drawHeight = svgHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  const xml = new XMLSerializer().serializeToString(svg);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      resolve();
    };
    img.onerror = () => reject(new Error("rasterizeSvgToCanvas: failed to decode SVG frame"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
}
