import chevronDownRaw from "lucide-static/icons/chevron-down.svg?raw";
import checkRaw from "lucide-static/icons/circle-check.svg?raw";
import clapperboardRaw from "lucide-static/icons/clapperboard.svg?raw";
import downloadRaw from "lucide-static/icons/download.svg?raw";
import eyeRaw from "lucide-static/icons/eye.svg?raw";
import filmRaw from "lucide-static/icons/film.svg?raw";
import loaderRaw from "lucide-static/icons/loader-2.svg?raw";
import moonRaw from "lucide-static/icons/moon.svg?raw";
import pauseRaw from "lucide-static/icons/pause.svg?raw";
import playRaw from "lucide-static/icons/play.svg?raw";
import rectangleHorizontalRaw from "lucide-static/icons/rectangle-horizontal.svg?raw";
import rectangleVerticalRaw from "lucide-static/icons/rectangle-vertical.svg?raw";
import repeatRaw from "lucide-static/icons/repeat.svg?raw";
import rocketRaw from "lucide-static/icons/rocket.svg?raw";
import rotateCcwRaw from "lucide-static/icons/rotate-ccw.svg?raw";
import serverRaw from "lucide-static/icons/server.svg?raw";
import sirenRaw from "lucide-static/icons/siren.svg?raw";
import sparklesRaw from "lucide-static/icons/sparkles.svg?raw";
import squareRaw from "lucide-static/icons/square.svg?raw";
import sunRaw from "lucide-static/icons/sun.svg?raw";
import trashRaw from "lucide-static/icons/trash-2.svg?raw";
import alertRaw from "lucide-static/icons/triangle-alert.svg?raw";
import closeRaw from "lucide-static/icons/x.svg?raw";
import instagramRaw from "simple-icons/icons/instagram.svg?raw";
import tiktokRaw from "simple-icons/icons/tiktok.svg?raw";
import youtubeRaw from "simple-icons/icons/youtube.svg?raw";

/** Stroke-based UI icons (lucide) — already ship `stroke="currentColor"`. */
export const ui = {
  play: playRaw,
  pause: pauseRaw,
  restart: rotateCcwRaw,
  download: downloadRaw,
  loader: loaderRaw,
  square: squareRaw,
  rectangleVertical: rectangleVerticalRaw,
  rectangleHorizontal: rectangleHorizontalRaw,
  sparkles: sparklesRaw,
  eye: eyeRaw,
  chevronDown: chevronDownRaw,
  repeat: repeatRaw,
  sun: sunRaw,
  moon: moonRaw,
  rocket: rocketRaw,
  siren: sirenRaw,
  // Render manager
  film: filmRaw,
  clapperboard: clapperboardRaw,
  trash: trashRaw,
  close: closeRaw,
  alert: alertRaw,
  check: checkRaw,
  server: serverRaw,
} as const;

/** Solid brand/social icons (simple-icons) — no fill set, need one injected. */
export const brand = {
  instagram: instagramRaw,
  tiktok: tiktokRaw,
  youtube: youtubeRaw,
} as const;

function withClass(svg: string, className: string): string {
  // lucide-static ships its own `class="lucide lucide-x"` on the root tag;
  // a second `class` attribute would just be ignored by the HTML parser
  // (first one wins), so replace it instead of appending.
  if (/\sclass="/.test(svg)) {
    return svg.replace(/\sclass="[^"]*"/, ` class="${className}"`);
  }
  return svg.replace(/<svg\b/, `<svg class="${className}"`);
}

/** Sizes/classes a stroke-based UI icon for inline use in a template string. */
export function uiIcon(svg: string, className = "w-4 h-4"): string {
  return withClass(svg, className);
}

/** Sizes a brand icon and makes it recolorable via Tailwind text-color utilities. */
export function brandIcon(svg: string, className = "w-4 h-4"): string {
  return withClass(svg.replace(/<svg\b/, '<svg fill="currentColor"'), className);
}

/**
 * Small checkerboard swatch — the standard "transparent background" symbol
 * used across design tools (Photoshop, Figma, etc.). More immediately
 * legible here than any generic icon would be.
 */
export function transparencySwatch(className = "w-4 h-4"): string {
  return `<span class="${className} inline-block rounded-full border border-line" style="background-image:conic-gradient(#8b8b8b 90deg,transparent 90deg 180deg,#8b8b8b 180deg 270deg,transparent 270deg);background-size:6px 6px;"></span>`;
}

/** Solid color swatch, for picking a background preset. */
export function colorSwatch(color: string, className = "w-4 h-4"): string {
  return `<span class="${className} inline-block rounded-full border border-line" style="background-color:${color};"></span>`;
}
