/**
 * Mounts raw SVG markup inline inside a container element and returns the
 * root <svg>. Animation engines (GSAP included) can only select/animate
 * nodes inside an SVG that lives in the DOM — an <img src="*.svg"> or a
 * CSS background-image keeps the SVG opaque to JS/CSS. This is the one
 * generic, mascot-agnostic step every future experiment needs first.
 */
export function mountInlineSvg(container: Element, svgMarkup: string): SVGSVGElement {
  container.innerHTML = svgMarkup;

  const svg = container.querySelector("svg");
  if (!svg) {
    throw new Error("mountInlineSvg: provided markup has no root <svg> element");
  }

  return svg;
}
