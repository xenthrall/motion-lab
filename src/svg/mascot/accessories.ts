/**
 * Named markup for the mascot's `#EXTRA` group — props she *wears*, as
 * opposed to props that exist in the scene around her.
 *
 * This is the accessory counterpart to expressions.ts, and follows the same
 * rule from src/svg/mascot/README.md: HEAD and the gradient never change,
 * accessories only ever add on top. Same coordinate system as
 * tequia-base.svg — head spans x 35-145, eyes sit at x 58-77 / 103-122,
 * y 67-86.
 *
 * `#EXTRA` is the last child of `#MASCOT`, so anything here draws over the
 * face. That makes it the right home for glasses, hats or badges, and the
 * wrong one for anything that should sit *behind* her (that belongs in a
 * scene layer, see src/svg/utils/scene-props.ts).
 */

const LENS = "#1c1633";
const RIM = "#c4b5fd";
const SHINE = "#f5f3ff";

export interface Accessory {
  markup: string;
}

export const accessories = {
  /** Nothing worn — the reset state. */
  none: { markup: "" },

  /**
   * Hero shades. Deliberately not black: the eyes underneath are #09090b,
   * so a black lens would read as a hole in the face. A very dark violet
   * with a bright rim and a diagonal shine streak keeps them legible at any
   * size, including a 1080x1920 export where the face fills the frame.
   */
  shades: {
    markup: `
      <g data-accessory="shades">
        <path d="M40 62 L52 66 L128 66 L140 62" fill="none" stroke="${RIM}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="51" y="63" width="32" height="25" rx="6" fill="${LENS}" stroke="${RIM}" stroke-width="2.5" />
        <rect x="97" y="63" width="32" height="25" rx="6" fill="${LENS}" stroke="${RIM}" stroke-width="2.5" />
        <rect x="83" y="71" width="14" height="5" rx="2.5" fill="${RIM}" />
        <path d="M56 84 L68 66 L74 66 L62 84 Z" fill="${SHINE}" opacity="0.45" />
        <path d="M102 84 L114 66 L120 66 L108 84 Z" fill="${SHINE}" opacity="0.45" />
      </g>
    `,
  },
} satisfies Record<string, Accessory>;

export type AccessoryName = keyof typeof accessories;
