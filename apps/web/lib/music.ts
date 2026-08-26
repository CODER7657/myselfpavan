"use client";

/**
 * The background track, looped without a seam.
 *
 * The supplied file is not a loop and cannot be played as one. Measured from
 * the decoded waveform in quarter-second windows:
 *
 *     duration          27.67 s
 *     0.00 - 0.50       silence
 *     0.50 - 6.00       music
 *     6.00 - 7.75       fades away to -87 dB
 *     8.00              hard restart at -19 dB
 *     8.00 - 25.00      music, with one musical rest around 13.5 s
 *     25.00 - 27.67     fades out, then 912 ms of silence
 *
 * On `loop` that plays a second and a half of silence every twenty-six
 * seconds, and half a second more in the middle. On a page somebody leaves
 * open it is not background music, it is a fault they notice a hundred times
 * an hour.
 *
 * So only the clean stretch is played, each pass crossfaded into the last on
 * the AudioContext clock — not with timers, which drift when the main thread
 * is busy.
 */
const SRC = "/audio/calm.mp3";

/*
 * Where the loop region comes from.
 *
 * Not from constants. The supplied file turned out to be three short phrases
 * separated by two silent gaps -- 0.6-6.9 s, 8.1-13.7 s, 14.7-26.1 s -- so any
 * pair of hand-picked bounds is wrong for the next file somebody drops in, and
 * every wrong pair loops through silence.
 *
 * So the buffer is measured on decode: 100 ms windows, and the longest run
 * that stays above the floor becomes the loop. If that run is too short to
 * bear repeating, the track is played once instead of looped, because an
 * eleven-second loop is not background music, it is a nagging.
 */
const WINDOW_S = 0.1;
const FLOOR_DB = -45;
/** Below this, repetition is more noticeable than the music. */
const MIN_LOOP_S = 20;
const CROSSFADE = 2.0;

interface Plan {
  start: number;
  end: number;
  loop: boolean;
}

let plan: Plan | null = null;

/** The longest stretch of the buffer that never drops to silence. */
function measure(buf: AudioBuffer): Plan {
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const windows = Math.floor(buf.duration / WINDOW_S);
  const floor = Math.pow(10, FLOOR_DB / 20);

  /* Starts empty, not as the whole file: seeded with the full duration, no
     shorter run could ever beat it and the measurement always reported one
     clean stretch — which is how the first version decided to loop straight
     through both silences. */
  let best = { from: 0, to: 0 };
  let runFrom: number | null = null;

  const close = (at: number) => {
    if (runFrom === null) return;
    if (at - runFrom > best.to - best.from) best = { from: runFrom, to: at };
    runFrom = null;
  };

  for (let i = 0; i < windows; i++) {
    let sum = 0;
    const from = (i * WINDOW_S * sr) | 0;
    const to = Math.min(ch.length, ((i + 1) * WINDOW_S * sr) | 0);
    for (let j = from; j < to; j++) sum += ch[j]! * ch[j]!;
    const rms = Math.sqrt(sum / Math.max(1, to - from));

    if (rms >= floor) {
      if (runFrom === null) runFrom = i * WINDOW_S;
    } else {
      close(i * WINDOW_S);
    }
  }
  close(windows * WINDOW_S);

  const span = best.to - best.from;
  return span >= MIN_LOOP_S
    ? { start: best.from, end: best.to, loop: true }
    : /* Nothing long enough to loop: play the whole thing once, trimmed of its
         leading and trailing silence only. */
      { start: firstSound(buf), end: lastSound(buf), loop: false };
}

function edge(buf: AudioBuffer, backwards: boolean): number {
  const ch = buf.getChannelData(0);
  const threshold = 0.002;
  if (backwards) {
    for (let i = ch.length - 1; i >= 0; i--) if (Math.abs(ch[i]!) > threshold) return i / buf.sampleRate;
    return buf.duration;
  }
  for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]!) > threshold) return i / buf.sampleRate;
  return 0;
}

const firstSound = (b: AudioBuffer) => edge(b, false);
const lastSound = (b: AudioBuffer) => edge(b, true);
/**
 * Equal-power crossfade curves.
 *
 * The first attempt used exponentialRampToValueAtTime from a 0.0001 floor,
 * which sounds like nothing for most of its length: such a ramp is still only
 * at 6e-4 a fifth of the way through. Rendered offline, the seam dipped to
 * -56 dB against a body of -33 -- an audible hole exactly where the crossfade
 * was meant to be. Sine and cosine sum to constant power, so the pair holds
 * the level flat across the overlap.
 */
const CURVE_STEPS = 128;
const FADE_IN = new Float32Array(CURVE_STEPS);
const FADE_OUT = new Float32Array(CURVE_STEPS);
for (let i = 0; i < CURVE_STEPS; i++) {
  const x = i / (CURVE_STEPS - 1);
  FADE_IN[i] = Math.sin((x * Math.PI) / 2);
  FADE_OUT[i] = Math.cos((x * Math.PI) / 2);
}

/** Background, not foreground. The cues in sound.ts peak at 0.06. */
const VOLUME = 0.16;
/** How far ahead the next pass is queued. */
const LOOKAHEAD_S = 1.0;
const TICK_MS = 250;
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let loading: Promise<AudioBuffer | null> | null = null;

let timer: ReturnType<typeof setInterval> | null = null;
let nextStartAt = 0;
let playing = false;
let finished: (() => void) | null = null;
const live = new Set<AudioBufferSourceNode>();

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
  }

  return ctx;
}

/** Fetched once, decoded once, and only when somebody actually asks for it. */
async function load(): Promise<AudioBuffer | null> {
  if (buffer) return buffer;
  if (loading) return loading;

  loading = (async () => {
    const c = context();
    if (!c) return null;

    try {
      const res = await fetch(SRC, { cache: "force-cache" });
      if (!res.ok) return null;
      buffer = await c.decodeAudioData(await res.arrayBuffer());
      return buffer;
    } catch {
      /* No music is a perfectly acceptable outcome. */
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/**
 * Queues one pass, fading it in across the tail of the pass before it.
 *
 * The two curves are sine and cosine, so the overlap holds constant power
 * rather than dipping through the middle of the crossfade.
 */
function schedulePass(at: number): void {
  const c = ctx;
  if (!c || !buffer || !out || !plan) return;

  const span = plan.end - plan.start;
  /* A crossfade longer than a quarter of the region would never reach full
     level, so it is bounded by the region rather than assumed. */
  const fade = plan.loop ? Math.min(CROSSFADE, span / 4) : 0;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const gain = c.createGain();
  if (fade > 0) {
    gain.gain.setValueAtTime(0, at);
    gain.gain.setValueCurveAtTime(FADE_IN, at, fade);
    gain.gain.setValueAtTime(1, at + fade);
    gain.gain.setValueCurveAtTime(FADE_OUT, at + span - fade, fade);
  } else {
    gain.gain.setValueAtTime(1, at);
  }

  src.connect(gain);
  gain.connect(out);
  src.start(at, plan.start, span);
  src.stop(at + span + 0.05);

  live.add(src);
  src.onended = () => {
    live.delete(src);
    try {
      src.disconnect();
      gain.disconnect();
    } catch {
      /* Already torn down. */
    }
    /* A track that cannot be looped ends for real, and says so, so the
       control can go back to reading "play" instead of lying. */
    if (!plan?.loop && playing && live.size === 0) {
      playing = false;
      finished?.();
    }
  };

  /* The next pass starts before this one ends: that overlap is the crossfade. */
  nextStartAt = at + span - fade;
}
function pump(): void {
  const c = ctx;
  if (!c || !playing || !plan?.loop) return;
  if (nextStartAt - c.currentTime < LOOKAHEAD_S) schedulePass(nextStartAt);
}

/** Starts the music. Must be called from a gesture — browsers require it. */
export async function startMusic(onFinished?: () => void): Promise<boolean> {
  const c = context();
  if (!c) return false;

  const buf = await load();
  if (!buf) return false;

  plan ??= measure(buf);
  finished = onFinished ?? null;

  if (c.state === "suspended") await c.resume().catch(() => undefined);
  if (playing) return true;

  playing = true;
  nextStartAt = c.currentTime + 0.05;
  schedulePass(nextStartAt);

  /* Up from silence over a couple of seconds, so it arrives rather than starts. */
  out!.gain.cancelScheduledValues(c.currentTime);
  out!.gain.setValueAtTime(Math.max(0.0001, out!.gain.value), c.currentTime);
  out!.gain.exponentialRampToValueAtTime(VOLUME, c.currentTime + 2);

  timer ??= setInterval(pump, TICK_MS);
  return true;
}

/** Stops it, fading out first — a hard stop reads as a fault. */
export function stopMusic(): void {
  const c = ctx;
  if (!c || !out) return;

  playing = false;

  const now = c.currentTime;
  out.gain.cancelScheduledValues(now);
  out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  window.setTimeout(() => {
    if (playing) return;
    for (const src of live) {
      try {
        src.stop();
      } catch {
        /* Already stopped. */
      }
    }
    live.clear();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1400);
}

/**
 * Music stops when the tab is hidden.
 *
 * A page playing to nobody, from a tab somebody cannot find, is the single
 * most irritating thing a site can do.
 */
export function watchVisibility(): () => void {
  const onChange = () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend().catch(() => undefined);
    } else if (playing) {
      void ctx.resume().catch(() => undefined);
    }
  };

  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
