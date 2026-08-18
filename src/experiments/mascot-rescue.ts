import { burst, cameraShake, flash, shockwave, speedLines } from "@/animations/effects";
import {
  anticipate,
  blink,
  bounce,
  dash,
  idleBreathing,
  setAccessory,
  setExpression,
  settle,
  spin,
  widenEyes,
  wobble,
} from "@/animations/moves";
import { accessories } from "@/svg/mascot/accessories";
import { expressions } from "@/svg/mascot/expressions";
import type { MascotParts } from "@/svg/utils/query-mascot";
import { appendSceneShape, upsertSceneLayer } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * "CÓDIGO ROJO" — ~16s de cine de acción, con la mascota de heroína.
 *
 * Este experimento existe para exprimir el motor: es el primero que usa
 * las tres capas a la vez — moves (la mascota), effects (la escena) y
 * accesorios en #EXTRA — y el primero con capas de profundidad (fondo
 * detrás de la mascota, efectos delante).
 *
 * GUION
 * -----
 * 1. Calma sospechosa — respira tranquila, parpadea. Todo bien.
 * 2. ¡ALERTA! Sirena roja y un "500" gigante que tapa el cuadro. Cuando
 *    se va, pánico total: salta, tiembla.
 * 3. Modo héroe — se agacha, cara de batalla, le caen las gafas. Fogonazo.
 * 4. Esquiva: un 404 le pasa por la cabeza (se agacha), un null por los
 *    pies (salta), y un bicho desde arriba (se tira de costado).
 * 5. Contraataque — giro y los tres estallan en partículas.
 * 6. El jefe final: un bicho gigante entra desde el fondo. Terremoto.
 * 7. Golpe final — anticipación, embestida, fogonazo blanco, explosión.
 * 8. Victoria — confeti, ✓ DEPLOYED, giro triunfal... y se le caen las
 *    gafas encima del guiño.
 *
 * Sobre el ritmo: los golpes caen cada ~1.5-2s y cada uno combina al menos
 * tres cosas (pose + efecto + sacudida). Un golpe de acción que solo mueve
 * un elemento se lee como un bug, no como un impacto.
 */

const FONT = "ui-monospace, 'Courier New', monospace";

const DANGER = "#ef4444";
const DANGER_SOFT = "#f87171";
const BRAND_LIGHT = "#c4b5fd";
const ACCENT = "#facc15";
const SUCCESS = "#34d399";
const INK = "#18181b";

function textGlyph(glyph: string, size: number, color: string, weight = 700): string {
  return `<text x="0" y="1" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle" dominant-baseline="central">${glyph}</text>`;
}

const BUG_SVG = `
  <ellipse cx="0" cy="2" rx="9" ry="6" fill="${INK}" />
  <circle cx="0" cy="-7" r="4" fill="${INK}" />
  <circle cx="-1.6" cy="-7.5" r="1.1" fill="${DANGER}" />
  <circle cx="1.6" cy="-7.5" r="1.1" fill="${DANGER}" />
  <line x1="-3" y1="-10" x2="-6" y2="-14" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" />
  <line x1="3" y1="-10" x2="6" y2="-14" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" />
  <g stroke="${INK}" stroke-width="1.5" stroke-linecap="round">
    <line x1="-8" y1="-2" x2="-13" y2="-5" /><line x1="-9" y1="2" x2="-15" y2="2" /><line x1="-8" y1="6" x2="-13" y2="9" />
    <line x1="8" y1="-2" x2="13" y2="-5" /><line x1="9" y1="2" x2="15" y2="2" /><line x1="8" y1="6" x2="13" y2="9" />
  </g>
`;

export function createMascotRescueTimeline(parts: MascotParts): gsap.core.Timeline {
  const root = parts.root;

  // Dos capas: la sirena tiñe la escena *detrás* de ella, mientras
  // proyectiles, explosiones y líneas de velocidad pasan *delante*. Esa
  // profundidad es la mitad de lo que hace que se lea como una escena y no
  // como calcomanías pegadas. (Las líneas de velocidad terminaron delante
  // justamente por eso: detrás, la mascota las tapaba casi enteras.)
  const bg = upsertSceneLayer(root, "rescue-bg", { behind: true });
  const fx = upsertSceneLayer(root, "rescue-fx");

  // El "500" va DELANTE, no detrás: la mascota ocupa casi todo el cuadro,
  // así que un cartel de alarma en el fondo queda tapado por su propia
  // cabeza (probado — solo asomaba un borde rojo). Delante, y saliendo
  // antes de que ella reaccione, además ordena mejor la escena: primero se
  // ve la amenaza, después el susto.
  const alert500 = appendSceneShape(fx, textGlyph("500", 62, DANGER, 800));
  const alertLabel = appendSceneShape(fx, textGlyph("PRODUCTION IS DOWN", 9, DANGER_SOFT, 700));
  const error404 = appendSceneShape(fx, textGlyph("404", 27, DANGER));
  const errorNull = appendSceneShape(fx, textGlyph("null", 25, DANGER_SOFT));
  const bug = appendSceneShape(fx, BUG_SVG);
  const boss = appendSceneShape(fx, BUG_SVG);
  const check = appendSceneShape(fx, textGlyph("✓", 44, SUCCESS));
  const deployed = appendSceneShape(fx, textGlyph("DEPLOYED", 14, SUCCESS, 800));

  const hidden = { opacity: 0, transformOrigin: "50% 50%" };
  gsap.set(alert500, { x: 90, y: 64, scale: 3.2, ...hidden });
  gsap.set(alertLabel, { x: 90, y: 126, scale: 0.8, ...hidden });
  gsap.set(error404, { x: 200, y: 72, ...hidden });
  gsap.set(errorNull, { x: -20, y: 108, ...hidden });
  gsap.set(bug, { x: 90, y: -25, ...hidden });
  gsap.set(boss, { x: 90, y: 60, scale: 0.15, ...hidden });
  gsap.set(check, { x: 90, y: 40, scale: 0.2, ...hidden });
  gsap.set(deployed, { x: 90, y: 122, scale: 0.6, ...hidden });

  // Shaking these three together is what makes it read as a camera move
  // rather than as loose objects rattling. See cameraShake's doc comment.
  const everything = [bg, fx, parts.mascot];

  const tl = gsap.timeline({ paused: true });

  // --- 1. Calma sospechosa -------------------------------------------------
  tl.add(idleBreathing(parts, { repeat: 0, duration: 0.5, amount: 0.02 }));
  tl.add(blink(parts, { times: 1 }), "-=0.35");

  // --- 2. ¡ALERTA! ---------------------------------------------------------
  // La sirena primero, la reacción después: el público tiene que ver la
  // amenaza antes que el susto, o el susto no significa nada.
  // El cartel entra de golpe, enorme, y se va: ocupa el cuadro apenas
  // medio segundo, lo justo para leerse.
  tl.add(flash(bg, { color: DANGER, opacity: 0.6, duration: 0.3 }), "+=0.15");
  tl.to(alert500, { opacity: 1, scale: 1, duration: 0.28, ease: "power3.out" }, "<");
  tl.add(cameraShake(everything, { intensity: 3, duration: 0.4, seed: 11 }), "<0.1");
  tl.to(alert500, { scale: 1.1, duration: 0.18, yoyo: true, repeat: 1 }, ">-0.1");
  tl.to(alertLabel, { opacity: 1, scale: 1, duration: 0.25 }, "<");
  tl.add(flash(bg, { color: DANGER, opacity: 0.45, duration: 0.26 }), "<");
  tl.to(alert500, { opacity: 0, scale: 0.4, duration: 0.22, ease: "power2.in" }, "+=0.1");

  // Recién ahora la reacción, con la cara despejada.
  tl.add(setExpression(parts, expressions.panic), "<0.12");
  tl.add(widenEyes(parts, { scale: 1.35, duration: 0.15 }), "<");
  tl.add(bounce(parts, { height: 22, duration: 0.45 }), "<");
  tl.add(flash(bg, { color: DANGER, opacity: 0.4, duration: 0.24 }), "<0.1");
  tl.add(wobble(parts, { cycles: 4, duration: 0.12, angle: 9 }), ">-0.05");
  tl.add(flash(bg, { color: DANGER, opacity: 0.35, duration: 0.22 }), "<");

  // --- 3. Modo héroe -------------------------------------------------------
  tl.to(alertLabel, { opacity: 0, scale: 0.7, duration: 0.3 }, "+=0.15");
  tl.add(anticipate(parts, { squash: 0.72, duration: 0.3 }), "<");
  tl.add(setExpression(parts, expressions.angry), ">-0.05");
  tl.to(parts.mascot, { scaleX: 1, scaleY: 1, y: 0, duration: 0.28, ease: "back.out(3)" }, "<");
  tl.add(setAccessory(parts, accessories.shades, { duration: 0.3, from: 30 }), "<0.12");
  tl.add(flash(fx, { color: "#ffffff", opacity: 0.5, duration: 0.22 }), "<");
  tl.add(
    speedLines(fx, { count: 12, duration: 0.5, direction: "left", opacity: 0.6, seed: 21 }),
    "<",
  );
  tl.add(shockwave(fx, { x: 90, y: 70, to: 62, duration: 0.5, color: BRAND_LIGHT }), "<0.05");

  // --- 4. Esquiva ----------------------------------------------------------
  // Cada proyectil pide una esquiva distinta según su eje: los horizontales
  // se esquivan agachándose o saltando, el vertical de costado.
  tl.add(
    speedLines(fx, { count: 8, duration: 0.45, direction: "left", opacity: 0.5, seed: 33 }),
    "+=0.15",
  );
  tl.to(error404, { opacity: 1, duration: 0.1 }, "<");
  tl.to(error404, { x: -30, rotation: -90, duration: 0.62, ease: "power1.in" }, "<");
  tl.add(anticipate(parts, { squash: 0.6, duration: 0.18 }), "<0.12");
  tl.to(parts.mascot, { scaleX: 1, scaleY: 1, y: 0, duration: 0.25, ease: "back.out(2)" }, ">");
  tl.to(error404, { opacity: 0, duration: 0.01 }, "<");
  tl.add(cameraShake([bg, fx], { intensity: 2, duration: 0.25, seed: 41 }), "<");

  tl.add(
    speedLines(fx, { count: 8, duration: 0.45, direction: "right", opacity: 0.5, seed: 55 }),
    "+=0.1",
  );
  tl.to(errorNull, { opacity: 1, duration: 0.1 }, "<");
  tl.to(errorNull, { x: 200, rotation: 120, duration: 0.62, ease: "power1.in" }, "<");
  tl.add(bounce(parts, { height: 30, duration: 0.5 }), "<0.1");
  tl.to(errorNull, { opacity: 0, duration: 0.01 }, ">-0.1");
  tl.add(cameraShake([bg, fx], { intensity: 2, duration: 0.25, seed: 67 }), "<");

  tl.to(bug, { opacity: 1, duration: 0.1 }, "+=0.05");
  tl.to(bug, { y: 128, rotation: 200, duration: 0.5, ease: "power1.in" }, "<");
  tl.add(dash(parts, { x: -28, duration: 0.3, stretch: 1.25, returnBack: false }), "<0.12");
  tl.to(bug, { opacity: 0, duration: 0.01 }, ">-0.05");
  tl.add(shockwave(fx, { x: 90, y: 124, to: 30, duration: 0.35, color: DANGER_SOFT }), "<");
  tl.add(cameraShake([bg, fx], { intensity: 3, duration: 0.3, seed: 71 }), "<");

  // --- 5. Contraataque -----------------------------------------------------
  tl.to(parts.mascot, { x: 0, duration: 0.22, ease: "power2.inOut" }, "+=0.1");
  tl.add(anticipate(parts, { squash: 0.75, duration: 0.22 }), "<");
  tl.add(spin(parts, { rotations: 1, duration: 0.55 }), ">");
  tl.to(parts.mascot, { scaleX: 1, scaleY: 1, y: 0, duration: 0.3, ease: "back.out(2)" }, "<");
  tl.add(burst(fx, { x: 44, y: 62, count: 12, distance: 26, duration: 0.5, seed: 91 }), "<0.15");
  tl.add(
    burst(fx, {
      x: 138,
      y: 84,
      count: 12,
      distance: 26,
      duration: 0.5,
      colors: [DANGER_SOFT, ACCENT],
      seed: 92,
    }),
    "<0.12",
  );
  tl.add(burst(fx, { x: 90, y: 118, count: 12, distance: 26, duration: 0.5, seed: 93 }), "<0.12");
  tl.add(shockwave(fx, { x: 90, y: 70, to: 70, duration: 0.5, rings: 2 }), "<");
  // rotation quedó en 360 tras el giro; a 0 es el mismo dibujo, pero deja
  // limpio el estado para lo que venga (settle no giraría al revés).
  tl.set(parts.mascot, { rotation: 0 });

  // --- 6. El jefe final ----------------------------------------------------
  tl.add(flash(bg, { color: DANGER, opacity: 0.5, duration: 0.3, hold: 0.1 }), "+=0.2");
  tl.to(boss, { opacity: 1, scale: 2.6, duration: 0.6, ease: "power3.in" }, "<");
  tl.add(setExpression(parts, expressions.surprised), "<0.35");
  tl.add(dash(parts, { x: 0, y: 14, duration: 0.3, stretch: 1.1, returnBack: false }), "<");
  tl.add(cameraShake(everything, { intensity: 6, duration: 0.55, cycles: 10, seed: 101 }), ">");
  tl.to(boss, { rotation: 6, duration: 0.18, yoyo: true, repeat: 3 }, "<");
  tl.to(parts.mascot, { y: 0, duration: 0.25, ease: "power2.out" }, "<0.3");
  tl.add(setExpression(parts, expressions.angry), "+=0.05");

  // --- 7. Golpe final ------------------------------------------------------
  tl.add(anticipate(parts, { squash: 0.62, duration: 0.32 }), "<0.05");
  tl.add(
    speedLines(fx, { count: 14, duration: 0.4, direction: "right", opacity: 0.65, seed: 111 }),
    ">-0.1",
  );
  tl.add(dash(parts, { x: 0, y: -22, duration: 0.22, stretch: 1.3, returnBack: false }), "<");
  // El impacto: fogonazo + anillos + explosión + terremoto, todos en el
  // mismo frame. Es el pico de la animación, no el momento de ser sutil.
  tl.add(flash(fx, { color: "#ffffff", opacity: 0.95, duration: 0.3 }), ">-0.02");
  tl.to(boss, { opacity: 0, scale: 3.4, duration: 0.2, ease: "power2.out" }, "<");
  tl.add(shockwave(fx, { x: 90, y: 66, to: 95, duration: 0.6, rings: 3, width: 6 }), "<");
  tl.add(
    burst(fx, {
      x: 90,
      y: 66,
      count: 26,
      distance: 68,
      duration: 0.8,
      size: 5,
      colors: [DANGER, ACCENT, BRAND_LIGHT],
      seed: 121,
    }),
    "<",
  );
  tl.add(cameraShake(everything, { intensity: 7, duration: 0.6, cycles: 11, seed: 131 }), "<");
  tl.to(parts.mascot, { y: 0, scaleX: 1, scaleY: 1, duration: 0.4, ease: "power2.out" }, "<0.15");

  // Se asienta el polvo: un respiro y un parpadeo. Sin esto quedaba casi un
  // segundo de mascota completamente inmóvil entre la explosión y el
  // festejo, y un personaje congelado se lee como que la animación se colgó.
  tl.to(parts.mascot, { scaleY: 0.94, scaleX: 1.04, duration: 0.28, ease: "sine.out" }, "+=0.1");
  tl.to(parts.mascot, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "sine.inOut" }, ">");
  tl.add(blink(parts, { times: 1 }), "<0.1");

  // --- 8. Victoria ---------------------------------------------------------
  tl.add(setExpression(parts, expressions.happy), "+=0.05");
  tl.to(check, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(3)" }, "<");
  tl.to(deployed, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.5)" }, "<0.12");
  tl.add(
    burst(fx, {
      x: 90,
      y: 8,
      count: 22,
      distance: 55,
      duration: 1.1,
      gravity: 70,
      spread: 120,
      angle: 90,
      size: 4.5,
      colors: [ACCENT, SUCCESS, BRAND_LIGHT, "#f472b6"],
      seed: 141,
    }),
    "<",
  );
  tl.add(spin(parts, { rotations: 1, duration: 0.6 }), "<0.1");
  tl.set(parts.mascot, { rotation: 0 });
  tl.add(bounce(parts, { height: 16, duration: 0.4 }), "+=0.05");

  // El botón cómico: se le caen las gafas justo cuando posa.
  tl.add(setExpression(parts, expressions.wink), "+=0.1");
  tl.to(
    parts.extra,
    { y: 46, rotation: 18, opacity: 0, duration: 0.45, ease: "power2.in" },
    "+=0.2",
  );
  tl.add(setAccessory(parts, accessories.none, { drop: false }), ">");
  tl.set(parts.extra, { y: 0, rotation: 0, opacity: 1 });
  tl.add(setExpression(parts, expressions.happy), "<");
  tl.to([check, deployed], { opacity: 0, duration: 0.3 }, "+=0.25");
  tl.add(settle(parts, { duration: 0.35 }), "<");
  tl.add(idleBreathing(parts, { repeat: 0, duration: 0.55, amount: 0.02 }), ">");

  return tl;
}
