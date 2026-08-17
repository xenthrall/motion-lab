/**
 * Typed access to the mascot's animatable groups. Any mounted mascot SVG
 * that follows the HEAD/EYES/MOUTH/EXTRA convention (see
 * src/svg/mascot/README.md) can be passed to queryMascotParts — animation
 * code never parses the SVG itself, only these four handles.
 */
export interface MascotParts {
  root: SVGSVGElement;
  /** Whole-body group (HEAD+EYES+MOUTH+EXTRA) — target for entrance/bounce/idle. */
  mascot: SVGGElement;
  head: SVGGElement;
  eyes: SVGGElement;
  mouth: SVGGElement;
  extra: SVGGElement;
}

const REQUIRED_GROUP_IDS = ["MASCOT", "HEAD", "EYES", "MOUTH", "EXTRA"] as const;

export function queryMascotParts(root: SVGSVGElement): MascotParts {
  const get = (id: (typeof REQUIRED_GROUP_IDS)[number]): SVGGElement => {
    const el = root.querySelector<SVGGElement>(`#${id}`);
    if (!el) {
      throw new Error(`queryMascotParts: mounted SVG is missing required group #${id}`);
    }
    return el;
  };

  return {
    root,
    mascot: get("MASCOT"),
    head: get("HEAD"),
    eyes: get("EYES"),
    mouth: get("MOUTH"),
    extra: get("EXTRA"),
  };
}
