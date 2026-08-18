import { ui } from "./icons";

/**
 * Purely presentational: which icon represents each experiment in the
 * lab UI. Deliberately kept out of src/experiments/registry.ts so that
 * file stays pure animation-definition metadata — adding a new
 * experiment never requires touching UI/icon code, it just falls back
 * to a sensible default here.
 */
const EXPERIMENT_ICONS: Record<string, string> = {
  "mascot-adventure": ui.rocket,
  "mascot-rescue": ui.siren,
};

export function experimentIcon(id: string): string {
  return EXPERIMENT_ICONS[id] ?? ui.sparkles;
}
