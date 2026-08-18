/**
 * Named EYES/MOUTH shape variants — actual shape swaps, not just
 * transforms. Per src/svg/mascot/README.md's convention: HEAD and the
 * gradient never change between expressions, only EYES/MOUTH content.
 * Each value is inner markup for the #EYES / #MOUTH groups respectively,
 * using the same coordinate system as tequia-base.svg (eyes centered
 * around y=67-89, mouth around y=99-113, face center x=90).
 */

const INK = "#09090b";
const SPARKLE = "#facc15";

export interface ExpressionShapes {
  eyes: string;
  mouth: string;
}

export const expressions = {
  neutral: {
    eyes: `<rect x="58" y="67" width="19" height="19" fill="${INK}" /><rect x="103" y="67" width="19" height="19" fill="${INK}" />`,
    mouth: `<rect x="74" y="103" width="32" height="5" rx="2.5" fill="${INK}" />`,
  },
  surprised: {
    eyes: `<circle cx="67.5" cy="77" r="12" fill="${INK}" /><circle cx="112.5" cy="77" r="12" fill="${INK}" />`,
    mouth: `<circle cx="90" cy="107" r="7" fill="${INK}" />`,
  },
  happy: {
    eyes: `<path d="M58 80 Q67.5 65 77 80" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none" /><path d="M103 80 Q112.5 65 122 80" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none" />`,
    mouth: `<path d="M70 99 Q90 121 110 99 Q90 113 70 99 Z" fill="${INK}" />`,
  },
  starstruck: {
    eyes: `<path d="M67.5 62 L70 73 L81 75.5 L70 78 L67.5 89 L65 78 L54 75.5 L65 73 Z" fill="${SPARKLE}" /><path d="M112.5 62 L115 73 L126 75.5 L115 78 L112.5 89 L110 78 L99 75.5 L110 73 Z" fill="${SPARKLE}" />`,
    mouth: `<path d="M70 99 Q90 121 110 99 Q90 113 70 99 Z" fill="${INK}" />`,
  },
  dizzy: {
    eyes: `<g stroke="${INK}" stroke-width="5" stroke-linecap="round"><line x1="59" y1="68" x2="76" y2="85" /><line x1="76" y1="68" x2="59" y2="85" /><line x1="104" y1="68" x2="121" y2="85" /><line x1="121" y1="68" x2="104" y2="85" /></g>`,
    mouth: `<path d="M72 104 Q78 98 84 104 Q90 110 96 104 Q102 98 108 104" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none" />`,
  },
  determined: {
    eyes: `<rect x="56" y="74" width="23" height="6" rx="3" fill="${INK}" /><rect x="101" y="74" width="23" height="6" rx="3" fill="${INK}" />`,
    mouth: `<rect x="80" y="104" width="20" height="4" rx="2" fill="${INK}" />`,
  },
  wink: {
    eyes: `<path d="M58 80 Q67.5 65 77 80" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none" /><rect x="103" y="67" width="19" height="19" fill="${INK}" />`,
    mouth: `<path d="M70 99 Q90 121 110 99 Q90 113 70 99 Z" fill="${INK}" />`,
  },
} satisfies Record<string, ExpressionShapes>;

export type ExpressionName = keyof typeof expressions;
