import {
  bounce,
  eyesShift,
  idleBreathing,
  lean,
  setExpression,
  settle,
  spin,
  tilt,
  widenEyes,
  wobble,
} from "@/animations/moves";
import { expressions } from "@/svg/mascot/expressions";
import type { MascotParts } from "@/svg/utils/query-mascot";
import { upsertSceneGroup } from "@/svg/utils/scene-props";
import gsap from "gsap";

/**
 * "The Code Adventure" — a ~18s mini-story built entirely from the moves
 * kit + setExpression + one-off scene props (this file owns the props;
 * they're too story-specific to belong in the generic moves kit).
 *
 * GUION
 * -----
 * 1. Calma — la mascota respira, todo tranquilo.
 * 2. Aparece un "{ }" — lo nota, se acerca curiosa.
 * 3. Lo examina de cerca, concentrada (¿código?).
 * 4. ¡Un bicho aparece! Salto de susto.
 * 5. Lo persigue juguetona, esquiva, y... ¡splat!
 * 6. Se le prende el foco — ¡IDEA! Ojos de estrella.
 * 7. Se pone a programar — montaje rítmico con 0s y 1s.
 * 8. Pausa para un café... y le pega el subidón — mareo cómico.
 * 9. Se recupera, aparece un check — ¡victoria! Giro triunfal.
 * 10. Despega un cohete — salto final y aterriza feliz, en calma otra vez.
 */

const FONT = "ui-monospace, 'Courier New', monospace";

function textGlyph(glyph: string, size: number, color: string): string {
  return `<text x="0" y="1" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="central">${glyph}</text>`;
}

const BRACES_SVG = textGlyph("{ }", 34, "#c4b5fd");
const CHECKMARK_SVG = textGlyph("✓", 32, "#34d399");
const ZERO_SVG = textGlyph("0", 20, "#c4b5fd");
const ONE_SVG = textGlyph("1", 20, "#c4b5fd");

const BUG_SVG = `
  <ellipse cx="0" cy="2" rx="9" ry="6" fill="#18181b" />
  <circle cx="0" cy="-7" r="4" fill="#18181b" />
  <line x1="-3" y1="-10" x2="-6" y2="-14" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" />
  <line x1="3" y1="-10" x2="6" y2="-14" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" />
  <g stroke="#18181b" stroke-width="1.5" stroke-linecap="round">
    <line x1="-8" y1="-2" x2="-13" y2="-5" /><line x1="-9" y1="2" x2="-15" y2="2" /><line x1="-8" y1="6" x2="-13" y2="9" />
    <line x1="8" y1="-2" x2="13" y2="-5" /><line x1="9" y1="2" x2="15" y2="2" /><line x1="8" y1="6" x2="13" y2="9" />
  </g>
`;

const BULB_SVG = `
  <circle cx="0" cy="-2" r="10" fill="#facc15" />
  <rect x="-4" y="7" width="8" height="5" rx="1.5" fill="#3f3f46" />
  <g stroke="#facc15" stroke-width="2" stroke-linecap="round">
    <line x1="0" y1="-18" x2="0" y2="-13" />
    <line x1="-13" y1="-2" x2="-9" y2="-2" />
    <line x1="13" y1="-2" x2="9" y2="-2" />
    <line x1="-9" y1="-11" x2="-6.5" y2="-8.5" />
    <line x1="9" y1="-11" x2="6.5" y2="-8.5" />
  </g>
`;

const COFFEE_SVG = `
  <path d="M-8-8 L8-8 L6 8 L-6 8 Z" fill="#a78bfa" />
  <path d="M8-5 q7 0 7 5 q0 5 -7 5" fill="none" stroke="#a78bfa" stroke-width="2.5" />
  <g stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8">
    <path d="M-3 -12 q2 -4 0 -7" />
    <path d="M3 -12 q2 -4 0 -7" />
  </g>
`;

const ROCKET_SVG = `
  <path d="M0-16 L7 2 L-7 2 Z" fill="#c4b5fd" />
  <rect x="-7" y="2" width="14" height="10" fill="#a78bfa" />
  <path d="M-7 6 L-13 14 L-7 12 Z" fill="#7c3aed" />
  <path d="M7 6 L13 14 L7 12 Z" fill="#7c3aed" />
  <circle cx="0" cy="-3" r="3" fill="#18181b" />
  <path d="M-4 12 L0 22 L4 12 Z" fill="#facc15" />
`;

export function createMascotAdventureTimeline(parts: MascotParts): gsap.core.Timeline {
  const root = parts.root;

  const braces = upsertSceneGroup(root, "adv-braces", BRACES_SVG);
  const bug = upsertSceneGroup(root, "adv-bug", BUG_SVG);
  const bulb = upsertSceneGroup(root, "adv-bulb", BULB_SVG);
  const zero = upsertSceneGroup(root, "adv-zero", ZERO_SVG);
  const one = upsertSceneGroup(root, "adv-one", ONE_SVG);
  const coffee = upsertSceneGroup(root, "adv-coffee", COFFEE_SVG);
  const check = upsertSceneGroup(root, "adv-check", CHECKMARK_SVG);
  const rocket = upsertSceneGroup(root, "adv-rocket", ROCKET_SVG);

  gsap.set(braces, { x: 24, y: 46, opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
  gsap.set(bug, { x: 148, y: 92, opacity: 0, scale: 0.6, transformOrigin: "50% 50%" });
  gsap.set(bulb, { x: 90, y: 8, opacity: 0, scale: 0.3, transformOrigin: "50% 50%" });
  gsap.set(zero, { x: 152, y: 58, opacity: 0, scale: 0.8, transformOrigin: "50% 50%" });
  gsap.set(one, { x: 26, y: 72, opacity: 0, scale: 0.8, transformOrigin: "50% 50%" });
  gsap.set(coffee, { x: 25, y: 90, opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
  gsap.set(check, { x: 153, y: 38, opacity: 0, scale: 0.3, transformOrigin: "50% 50%" });
  gsap.set(rocket, { x: 90, y: 14, opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });

  const tl = gsap.timeline({ paused: true });

  // --- 1. Calma ---
  tl.add(idleBreathing(parts, { repeat: 1, duration: 0.6, amount: 0.02 }));

  // --- 2. Aparece "{ }" — lo nota ---
  tl.to(braces, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, "+=0.2");
  tl.add(widenEyes(parts, { scale: 1.15 }), "<");
  tl.add(eyesShift(parts, { x: -5, y: -2 }), "<");
  tl.add(tilt(parts, { angle: -8 }), "+=0.05");

  // --- 3. Se acerca, examina concentrada ---
  tl.add(lean(parts, { x: -7, y: -2, duration: 0.5 }), "+=0.15");
  tl.add(setExpression(parts, expressions.determined), "+=0.1");
  tl.add(tilt(parts, { angle: 6, duration: 0.35 }), "+=0.2");
  tl.add(tilt(parts, { angle: -6, duration: 0.35 }), "+=0.1");
  tl.add(tilt(parts, { angle: 0, duration: 0.3 }), "+=0.1");

  // --- 4. ¡Un bicho! Susto ---
  tl.to(braces, { opacity: 0, scale: 0.6, duration: 0.3 }, "+=0.25");
  tl.to(bug, { opacity: 1, scale: 1, x: 100, y: 90, duration: 0.5, ease: "power2.out" }, "<");
  tl.add(setExpression(parts, expressions.surprised), "+=0.05");
  tl.add(lean(parts, { x: -12, y: -4, duration: 0.25 }), "<");
  tl.add(widenEyes(parts, { scale: 1.3, duration: 0.15 }), "<");

  // --- 5. Persecución juguetona y... ¡splat! ---
  tl.to(bug, { x: 68, y: 96, duration: 0.3, ease: "power1.inOut" }, "+=0.25");
  tl.add(lean(parts, { x: -3, y: 0, duration: 0.25 }), "<");
  tl.to(bug, { x: 116, y: 87, duration: 0.3, ease: "power1.inOut" }, "+=0.1");
  tl.add(lean(parts, { x: 4, y: -1, duration: 0.25 }), "<");
  tl.add(setExpression(parts, expressions.determined), "+=0.1");
  tl.to(bug, { x: 90, y: 92, duration: 0.3, ease: "power2.in" }, "<");
  tl.add(bounce(parts, { height: 10, duration: 0.35 }), "<");
  tl.to(bug, { opacity: 0, scale: 0, duration: 0.15, ease: "power3.in" }, "+=0.1");
  tl.add(setExpression(parts, expressions.happy), "+=0.1");

  // --- 6. ¡Se le prende el foco! Idea ---
  tl.to(bulb, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, "+=0.3");
  tl.add(setExpression(parts, expressions.starstruck), "<");
  tl.add(bounce(parts, { height: 16, duration: 0.4 }), "<");
  tl.to(bulb, { scale: 1.15, duration: 0.22, repeat: 3, yoyo: true, ease: "sine.inOut" }, "<");

  // --- 7. Montaje: se pone a programar ---
  tl.to(bulb, { opacity: 0, duration: 0.3 }, "+=0.4");
  tl.add(setExpression(parts, expressions.determined), "<");
  tl.to(zero, { opacity: 0.85, scale: 1, duration: 0.25 }, "<");
  tl.to(one, { opacity: 0.85, scale: 1, duration: 0.25 }, "+=0.1");
  tl.add(bounce(parts, { height: 5, duration: 0.18 }), "+=0.1");
  tl.add(bounce(parts, { height: 5, duration: 0.18 }), "+=0.05");
  tl.add(bounce(parts, { height: 5, duration: 0.18 }), "+=0.05");
  tl.to(zero, { y: "-=6", opacity: 0, duration: 0.3 }, "+=0.1");
  tl.to(one, { y: "+=6", opacity: 0, duration: 0.3 }, "<");

  // --- 8. Pausa café... subidón de cafeína ---
  tl.to(coffee, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, "+=0.3");
  tl.add(lean(parts, { x: -6, y: 0, duration: 0.3 }), "<");
  tl.add(bounce(parts, { height: 8, duration: 0.25 }), "+=0.15");
  tl.to(coffee, { opacity: 0, duration: 0.25 }, "<");
  tl.add(setExpression(parts, expressions.dizzy), "+=0.1");
  tl.add(wobble(parts, { cycles: 5, duration: 0.14, angle: 10 }), "<");

  // --- 9. Se recupera — ¡victoria! ---
  tl.add(settle(parts, { duration: 0.3 }), "+=0.15");
  tl.add(setExpression(parts, expressions.wink), "+=0.1");
  tl.to(check, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, "<");
  tl.add(spin(parts, { rotations: 1, duration: 0.6 }), "+=0.15");
  tl.add(bounce(parts, { height: 14, duration: 0.35 }), "+=0.1");

  // --- 10. Despegue final y aterrizaje en calma ---
  tl.to(check, { opacity: 0, duration: 0.25 }, "+=0.3");
  tl.to(rocket, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, "<");
  tl.add(setExpression(parts, expressions.happy), "<");
  tl.add(lean(parts, { x: 0, y: 6, duration: 0.2 }), "+=0.2");
  tl.to(rocket, { y: "-=75", opacity: 0, duration: 0.7, ease: "power2.in" }, "+=0.1");
  tl.add(bounce(parts, { height: 20, duration: 0.5 }), "<");
  tl.add(settle(parts, { duration: 0.4 }), "+=0.15");
  tl.add(idleBreathing(parts, { repeat: 1, duration: 0.6, amount: 0.02 }), "+=0.15");

  return tl;
}
