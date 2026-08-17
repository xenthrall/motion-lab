import type { MascotParts } from "@/svg/utils/query-mascot";
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
];
