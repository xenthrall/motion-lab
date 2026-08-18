import type { MascotParts } from "@/svg/utils/query-mascot";
import { createMascotAdventureTimeline } from "./mascot-adventure";
import { createMascotCuriosityTimeline } from "./mascot-curiosity";
import { createMascotIntroTimeline } from "./mascot-intro";

export interface ExperimentDefinition {
  id: string;
  label: string;
  description: string;
  create: (parts: MascotParts) => gsap.core.Timeline;
}

/**
 * Every experiment the lab UI can play/export shows up here. Add a new
 * entry when a new experiment file is created — the selector in main.ts
 * reads this list, nothing else needs to change.
 */
export const experiments: ExperimentDefinition[] = [
  {
    id: "mascot-intro",
    label: "Intro (entrada + idle + blink + bounce)",
    description: "Primer experimento compuesto: prueba el kit de moves de punta a punta.",
    create: createMascotIntroTimeline,
  },
  {
    id: "mascot-curiosity",
    label: "Curiosidad (nota un objeto y reacciona)",
    description:
      "La mascota respira, nota un objeto nuevo en escena, lo mira con curiosidad, se acerca y vuelve a su postura neutra.",
    create: createMascotCuriosityTimeline,
  },
  {
    id: "mascot-adventure",
    label: "La aventura del código",
    description:
      "Un bicho la asusta, persigue y aplasta; se le prende el foco con una idea; programa, toma café de más y se marea; festeja con un giro y despega un cohete. ~18s de historia.",
    create: createMascotAdventureTimeline,
  },
];
