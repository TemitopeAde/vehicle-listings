// Turns the captured frames and input log into the promo MP4.
// Frames keep their real capture timing (30 fps output), and click and key
// sounds are synthesised at the exact times the driver logged each input.
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILD = process.env.PROMO_BUILD_DIR || path.join(here, "build");
const OUTPUT = path.join(here, "output", "vehicle-listings-promo.mp4");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const SAMPLE_RATE = 48000;
const FPS = 30;
const TAIL = 0.6; // hold the last frame briefly so the end card lands

const { frames, events } = JSON.parse(
  await fs.readFile(path.join(BUILD, "timeline.json"), "utf8"),
);
if (!frames.length) throw new Error("No frames captured");

const base = frames[0].ts;
const duration = frames[frames.length - 1].ts - base + TAIL;

// ---------- video: concat list with real frame durations ----------
const concat = frames
  .map((f, i) => {
    const next = frames[i + 1];
    // Real capture gaps; fps=30 below resamples them onto a constant grid.
    const d = next ? Math.max(next.ts - f.ts, 0.001) : TAIL;
    return `file 'frames/${f.file}'\nduration ${d.toFixed(5)}`;
  })
  .concat(`file 'frames/${frames[frames.length - 1].file}'`)
  .join("\n");
await fs.writeFile(path.join(BUILD, "concat.txt"), concat + "\n");

const video = path.join(BUILD, "video.mp4");
execFileSync(
  FFMPEG,
  [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-vf", `fps=${FPS}`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "animation",
    "-pix_fmt", "yuv420p", "-color_range", "tv",
    "-movflags", "+faststart", "-an",
    video,
  ],
  { cwd: BUILD, stdio: "inherit" },
);

// ---------- audio: clicks and keystrokes only ----------
let seed = 20261021;
const rand = () => {
  // mulberry32: repeatable noise, so every render sounds the same
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const total = Math.ceil(duration * SAMPLE_RATE) + SAMPLE_RATE;
const mix = new Float32Array(total);

function voice(startSample, { length, amp, tone, toneDecay, noiseDecay, noiseGain }) {
  const n = Math.floor(length * SAMPLE_RATE);
  const toneFreq = tone * (0.94 + rand() * 0.12);
  let prevNoise = 0;
  for (let i = 0; i < n; i++) {
    const idx = startSample + i;
    if (idx >= total) break;
    const t = i / SAMPLE_RATE;
    const noise = rand() * 2 - 1;
    const highpassed = noise - prevNoise; // thin, crisp top end
    prevNoise = noise;
    const body = Math.sin(2 * Math.PI * toneFreq * t) * Math.exp(-t * toneDecay) * 0.4;
    const snap = highpassed * Math.exp(-t * noiseDecay) * noiseGain;
    mix[idx] += (body + snap) * amp;
  }
}

for (const ev of events) {
  const at = Math.round((ev.t / 1000 - base) * SAMPLE_RATE);
  if (at < 0 || at >= total) continue;
  if (ev.kind === "click") {
    // Mouse press: a firmer, slightly lower tick
    voice(at, { length: 0.07, amp: 0.55, tone: 1500, toneDecay: 85, noiseDecay: 620, noiseGain: 0.7 });
  } else {
    // Keystroke: a quieter, brighter key tap with a little pitch variation
    voice(at, { length: 0.04, amp: 0.2 + rand() * 0.07, tone: 2900, toneDecay: 230, noiseDecay: 900, noiseGain: 0.55 });
  }
}

let peak = 0;
for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(mix[i]));
const gain = peak > 0.85 ? 0.85 / peak : 1;

function writeWav(file, samples) {
  const dataBytes = samples.length * 2 * 2; // stereo, 16-bit
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    const s = Math.round(v * 32767);
    buf.writeInt16LE(s, o);
    buf.writeInt16LE(s, o + 2); // identical in both channels
    o += 4;
  }
  return fs.writeFile(file, buf);
}

const audio = path.join(BUILD, "clicks.wav");
await writeWav(audio, mix);

// ---------- mux ----------
await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
execFileSync(
  FFMPEG,
  [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", video, "-i", audio,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    "-shortest", "-movflags", "+faststart",
    OUTPUT,
  ],
  { stdio: "inherit" },
);

const clicks = events.filter((e) => e.kind === "click").length;
console.log(
  `wrote ${OUTPUT}: ${duration.toFixed(1)}s, ${frames.length} frames, ${clicks} clicks, ${events.length - clicks} keystrokes`,
);
