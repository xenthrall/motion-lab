import { spawn, spawnSync } from "node:child_process";

/**
 * ffmpeg, wrapped as a "push PNG frames in, get a video file out" sink.
 *
 * The CLI used to write every frame to a temp directory as
 * `frame-000123.png` and hand ffmpeg the numbered sequence at the end.
 * Streaming them into ffmpeg's stdin instead means: no temp directory to
 * create/clean up (and none left behind if the process is killed), no
 * writing then immediately re-reading hundreds of megabytes of PNG, and
 * encoding that overlaps frame capture instead of starting after it.
 *
 * `ffmpeg` itself is not bundled — see docs/dependencies.md for why
 * `ffmpeg-static` was rejected.
 */

export interface EncoderOptions {
  outputPath: string;
  fps: number;
  /** Transparent renders take a completely different codec path (VP9 with
   * an alpha plane); solid ones get H.264, which every social platform eats. */
  transparent: boolean;
}

export interface FrameEncoder {
  /** Resolves once ffmpeg has accepted the frame (honours backpressure). */
  write(png: Buffer): Promise<void>;
  /** Closes stdin and waits for a clean exit. Rejects with ffmpeg's stderr. */
  finish(): Promise<void>;
  /** Kills ffmpeg immediately — used when a job is cancelled. */
  abort(): void;
}

export function isFfmpegAvailable(): boolean {
  const check = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return !check.error && check.status === 0;
}

function buildArgs({ outputPath, fps, transparent }: EncoderOptions): string[] {
  const input = ["-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "pipe:0"];
  const output = transparent
    ? [
        "-c:v",
        "libvpx-vp9",
        // yuva420p is what carries the alpha plane; -auto-alt-ref 0 is
        // required for VP9 alpha to survive (alt-ref frames drop it).
        "-pix_fmt",
        "yuva420p",
        "-auto-alt-ref",
        "0",
        "-crf",
        "15",
        "-b:v",
        "0",
      ]
    : [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "15",
        // Offline rendering has no real-time budget, so we can afford the
        // encoder settings a live MediaRecorder capture never could.
        "-preset",
        "slow",
        "-movflags",
        "+faststart",
      ];
  return [...input, ...output, outputPath];
}

export function startEncoder(options: EncoderOptions): FrameEncoder {
  const proc = spawn("ffmpeg", buildArgs(options), { stdio: ["pipe", "ignore", "pipe"] });

  let stderr = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    // ffmpeg is chatty; only the tail is ever useful in an error message.
    if (stderr.length > 16_000) stderr = stderr.slice(-16_000);
  });

  let finished = false;
  let aborted = false;

  const closed = new Promise<void>((resolve, reject) => {
    proc.on("error", (error: Error) => {
      finished = true;
      reject(new Error(`no se pudo ejecutar ffmpeg: ${error.message}`));
    });
    proc.on("close", (code, signal) => {
      finished = true;
      if (aborted || code === 0) {
        resolve();
        return;
      }
      const how = signal ? ` (señal ${signal})` : "";
      reject(new Error(`ffmpeg terminó con código ${code}${how}\n${stderr.slice(-2000)}`));
    });
  });
  // Nothing awaits `closed` until finish(); park a handler so an early
  // failure doesn't surface as an unhandled rejection first.
  closed.catch(() => {});
  // ffmpeg dying mid-render makes the next write EPIPE. That's expected, and
  // the real error is the one from `closed` — swallow the stream-level one.
  proc.stdin.on("error", () => {});

  return {
    write(png: Buffer): Promise<void> {
      if (finished) {
        return Promise.reject(new Error("ffmpeg ya no acepta frames"));
      }
      if (proc.stdin.write(png)) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          proc.stdin.off("drain", onDrain);
          proc.off("close", onClose);
        };
        const onDrain = () => {
          cleanup();
          resolve();
        };
        const onClose = () => {
          cleanup();
          reject(new Error("ffmpeg cerró su entrada antes de tiempo"));
        };
        proc.stdin.once("drain", onDrain);
        proc.once("close", onClose);
      });
    },

    async finish(): Promise<void> {
      await new Promise<void>((resolve) => proc.stdin.end(resolve));
      await closed;
    },

    abort(): void {
      aborted = true;
      proc.stdin.destroy();
      proc.kill("SIGKILL");
    },
  };
}
