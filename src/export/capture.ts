import { rasterizeSvgToCanvas } from "./rasterize";

export type ExportFormat = "mp4" | "webm-transparent";

export interface RecordOptions {
  width: number;
  height: number;
  fps?: number;
  format: ExportFormat;
  /** Ignored when format is "webm-transparent" — the canvas stays transparent instead. */
  backgroundColor?: string;
}

export interface RecordResult {
  blob: Blob;
  mimeType: string;
  extension: string;
}

const OPAQUE_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

// VP9-in-WebM is, empirically (tested against this exact capture pipeline —
// canvas alpha:true -> captureStream -> MediaRecorder -> decode), the one
// combination Chrome preserves the alpha channel through end to end. MP4/
// H.264 has no alpha channel at all, so transparency can only be offered
// as WebM, and specifically VP9 (not VP8/whatever "video/webm" defaults to).
const TRANSPARENT_MIME_TYPE = "video/webm;codecs=vp9";

function pickMimeType(format: ExportFormat): { mimeType: string; extension: string } {
  if (format === "webm-transparent") {
    if (
      typeof MediaRecorder === "undefined" ||
      !MediaRecorder.isTypeSupported(TRANSPARENT_MIME_TYPE)
    ) {
      throw new Error(
        "Este navegador no soporta grabación WebM/VP9, necesaria para exportar con transparencia.",
      );
    }
    return { mimeType: TRANSPARENT_MIME_TYPE, extension: "webm" };
  }

  for (const type of OPAQUE_MIME_CANDIDATES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return { mimeType: type, extension: type.startsWith("video/mp4") ? "mp4" : "webm" };
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

/**
 * Records an SVG animation to a video Blob using only native browser APIs
 * (canvas + MediaRecorder) — no ffmpeg/Remotion. `play()` is called once
 * recording has started and must resolve when the animation is done (e.g.
 * a GSAP timeline's onComplete). The live SVG is re-rasterized onto an
 * offscreen canvas every animation frame, letterboxed to fit the target
 * width/height, and that canvas is what gets captured.
 *
 * Rasterization is `new Image()` + a data: URI. Two alternatives were
 * benchmarked against this exact scene (mascot-adventure, 8 scene props,
 * ~1080x1080) and rejected: `createImageBitmap(Blob)` fails outright on
 * SVG sources in this Chrome/headless build ("the source image could not
 * be decoded" — confirmed even for a trivial <rect> SVG, so it's not
 * fixable by e.g. adding explicit width/height), and `Image.src =
 * URL.createObjectURL(blob)` measured *slower* (~38ms/frame) than the
 * data-URI it was meant to replace (~18ms/frame) — Blob URL registration
 * overhead outweighs the tiny XML string's encodeURIComponent cost.
 * Reusing a single Image element instead of `new Image()` per frame was
 * also measured and made no meaningful difference (object churn isn't
 * the bottleneck; SVG decode+paint cost is). Keep this simple until
 * there's a genuinely faster primitive to switch to.
 *
 * Caveat: this is a real-time capture (it takes as long as the animation
 * itself), not a deterministic frame-by-frame renderer. For clips heavy
 * enough that this still drops frames, see the offline renderer
 * (`npm run render`, src/render/) — same GSAP timelines, no real-time
 * constraint at all.
 */
export async function recordSvgAnimation(
  svg: SVGSVGElement,
  play: () => Promise<void>,
  options: RecordOptions,
): Promise<RecordResult> {
  const { width, height, fps = 30, format, backgroundColor = "#111111" } = options;
  const transparent = format === "webm-transparent";

  // Fail fast, before touching the canvas/recorder, if this format can't work here.
  const { mimeType, extension } = pickMimeType(format);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("recordSvgAnimation: 2D canvas context unavailable");
  }

  let stopped = false;
  const drawFrame = () => {
    if (stopped) return;
    rasterizeSvgToCanvas(svg, ctx, { width, height, transparent, backgroundColor }).catch(() => {
      // Skip a frame that failed to rasterize rather than aborting the whole recording over it.
    });
    requestAnimationFrame(drawFrame);
  };
  requestAnimationFrame(drawFrame);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
  try {
    await play();
  } finally {
    stopped = true;
    recorder.stop();
    for (const track of stream.getTracks()) track.stop();
  }

  const blob = await recordingDone;
  return { blob, mimeType, extension };
}
