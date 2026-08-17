import mascotSvg from "@/svg/mascot/tequia-base.svg?raw";
import { mountInlineSvg } from "@/svg/utils/inline-svg";
import gsap from "gsap";

/**
 * Smoke-test entry point.
 *
 * This does NOT implement any animation. It mounts the mascot SVG inline
 * (static, unanimated) just to confirm the asset loads and its HEAD/EYES/
 * MOUTH/EXTRA groups are in place, and confirms the dev environment
 * (Vite + TypeScript) and the animation engine (GSAP) are wired
 * correctly. See src/experiments/ for future animation work.
 */
const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <h1>Tequia Motion Lab</h1>
    <div id="stage" class="stage"></div>
    <p class="status">env ready &middot; gsap ${gsap.version} &middot; no experiments loaded yet</p>
  `;

  const stage = app.querySelector<HTMLDivElement>("#stage");
  if (stage) {
    mountInlineSvg(stage, mascotSvg);
  }
}
