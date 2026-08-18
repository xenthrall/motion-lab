import type { MascotParts } from "@/svg/utils/query-mascot";
import { createMascotAdventureTimeline } from "./mascot-adventure";
import { createMascotRescueTimeline } from "./mascot-rescue";

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
    id: "mascot-adventure",
    label: "La aventura del código",
    description:
      "Un bicho la asusta, persigue y aplasta; se le prende el foco con una idea; programa, toma café de más y se marea; festeja con un giro y despega un cohete. ~18s de historia.",
    create: createMascotAdventureTimeline,
  },
  {
    id: "mascot-rescue",
    label: "Código Rojo",
    description:
      "Producción se cae y la mascota se pone las gafas de héroe: esquiva errores, contraataca girando, se enfrenta a un bug gigante y despliega. ~16s de acción con efectos de escena.",
    create: createMascotRescueTimeline,
  },
];
